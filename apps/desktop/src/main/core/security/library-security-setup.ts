import { createHash, randomUUID } from "node:crypto";
import {
  copyFile,
  lstat,
  mkdir,
  open,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import type Database from "better-sqlite3";
import { z } from "zod";
import { KEYCHAIN_LIBRARY_MASTER_KEY_PREFIX } from "../../../shared/constants";
import { rekeySqlCipher } from "../../database/encrypted-sqlite";
import { deleteSecret, getSecureSecret, setSecureSecret } from "../../keychain";
import {
  type EncryptionMigrationEntryKind,
  type EncryptionMigrationJournal,
  EncryptionMigrationJournalStore,
  type PlannedEncryptionMigrationEntry,
} from "./encryption-migration-journal";
import {
  decodeLibraryFile,
  encodeLibraryFile,
  isEncryptedLibraryFile,
} from "./library-file-storage";
import {
  clearLibraryKey,
  deriveLibrarySubkey,
  installLibraryKey,
} from "./library-key-runtime";
import {
  encryptLibraryMediaFile,
  isEncryptedLibraryMedia,
  readLibraryMedia,
} from "./library-media-storage";
import {
  createLibrarySecurity,
  type ScryptWorkFactors,
  unlockLibraryWithPassword,
} from "./library-security";
import {
  LIBRARY_MASTER_KEY_BYTES,
  LIBRARY_SECURITY_MANIFEST_FILENAME,
  type LibrarySecurityManifest,
  LibrarySecurityManifestSchema,
  serializeLibrarySecurityManifest,
} from "./library-security-manifest";

const SECURITY_DIRECTORY = ".security";
const STAGING_DIRECTORY = `${SECURITY_DIRECTORY}/encryption-staging`;
const PENDING_ACCOUNT_PREFIX = "library:security-setup";
const BACKUP_MANIFEST_FILENAME = "migration-backup.json";

const BackupEntrySchema = z.strictObject({
  scope: z.enum(["library", "cache", "index"]),
  path: z.string().min(1),
  size: z.number().int().nonnegative(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  migrate: z.boolean(),
});

const BackupManifestSchema = z.strictObject({
  version: z.literal(1),
  libraryId: z.string().min(1),
  migrationId: z.string().min(1),
  entries: z.array(BackupEntrySchema).min(1),
});

const PendingSetupSchema = z.strictObject({
  version: z.literal(1),
  migrationId: z.string().min(1),
  backupPath: z.string().min(1),
  recoveryKey: z.string().min(1),
  manifest: LibrarySecurityManifestSchema,
});

type BackupEntry = z.infer<typeof BackupEntrySchema>;
type PendingSetup = z.infer<typeof PendingSetupSchema>;
type FileScope = BackupEntry["scope"];

interface InventoryEntry extends BackupEntry {
  sourcePath: string;
  journalSource: string;
  kind: EncryptionMigrationEntryKind;
  storage: "buffer" | "media" | "index";
}

export interface LibrarySecuritySecureStorage {
  get(account: string): Promise<string | null>;
  set(account: string, value: string): Promise<void>;
  delete(account: string): Promise<void>;
}

export interface LibrarySecurityIndexMigration {
  checkpoint(): Promise<void>;
  rekey(key: Uint8Array): Promise<void>;
  verify(): Promise<void>;
  restore(backupPath: string): Promise<void>;
}

export interface LibrarySecuritySetupDependencies {
  secureStorage?: LibrarySecuritySecureStorage;
  index?: LibrarySecurityIndexMigration;
}

export interface SetupLibrarySecurityInput {
  libraryId: string;
  password: string;
  libraryRoot: string;
  cacheRoot: string;
  indexPath: string;
  indexConnection?: Database.Database;
  existingIndexKey?: Uint8Array;
  backupPath?: string;
  passwordKdf?: ScryptWorkFactors;
  recoveryKdf?: ScryptWorkFactors;
  dependencies?: LibrarySecuritySetupDependencies;
}

export interface SetupLibrarySecurityResult {
  manifest: LibrarySecurityManifest;
  recoveryKey: string;
  backupPath: string;
  resumed: boolean;
}

interface SetupContext {
  input: SetupLibrarySecurityInput;
  root: string;
  cacheRoot: string;
  indexPath: string;
  secureStorage: LibrarySecuritySecureStorage;
  index: LibrarySecurityIndexMigration;
  pendingAccount: string;
  masterAccount: string;
}

function sha256(value: Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

async function fileChecksum(path: string): Promise<{
  sha256: string;
  size: number;
}> {
  const bytes = await readFile(path);
  return { sha256: sha256(bytes), size: bytes.byteLength };
}

function portablePath(path: string): string {
  return path.split(sep).join("/");
}

function pathInside(parent: string, candidate: string): boolean {
  const child = relative(resolve(parent), resolve(candidate));
  return child === "" || (child !== ".." && !child.startsWith(`..${sep}`));
}

function assertExternalBackup(
  backupPath: string,
  root: string,
  cacheRoot: string,
  indexPath: string,
): void {
  if (
    pathInside(root, backupPath) ||
    pathInside(cacheRoot, backupPath) ||
    resolve(backupPath) === resolve(indexPath)
  ) {
    throw new Error(
      "The encryption backup must be outside the Library, cache, and index.",
    );
  }
}

function entryKind(
  scope: FileScope,
  path: string,
): EncryptionMigrationEntryKind {
  const normalized = portablePath(path).toLowerCase();
  const name = basename(normalized);
  if (scope === "index") return "index";
  if (scope === "cache" || name.includes("thumbnail")) return "thumbnail";
  if (normalized.startsWith("backup/")) return "backup";
  if (name === "settings.json") return "settings";
  if (name === "organization.json" || name === "tags.json")
    return "organization";
  if (normalized.includes("/chats/") || normalized.startsWith("chats/"))
    return "chat";
  if (name.endsWith(".json")) return "metadata";
  if (normalized.startsWith("items/") || normalized.startsWith("trash/"))
    return "item-file";
  return "other";
}

function storageKind(
  scope: FileScope,
  path: string,
): InventoryEntry["storage"] {
  if (scope === "index") return "index";
  if (path.toLowerCase().endsWith(".json")) return "buffer";
  if (
    scope === "cache" ||
    portablePath(path).startsWith("items/") ||
    portablePath(path).startsWith("trash/") ||
    portablePath(path).startsWith("backup/")
  )
    return "media";
  return "buffer";
}

async function inventoryDirectory(input: {
  scope: "library" | "cache";
  root: string;
  directory?: string;
}): Promise<InventoryEntry[]> {
  const directory = input.directory ?? input.root;
  const result: InventoryEntry[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    const relativePath = portablePath(relative(input.root, path));
    if (
      input.scope === "library" &&
      (relativePath === SECURITY_DIRECTORY ||
        relativePath.startsWith(`${SECURITY_DIRECTORY}/`) ||
        relativePath.startsWith(".capture-queue/") ||
        relativePath === LIBRARY_SECURITY_MANIFEST_FILENAME)
    )
      continue;
    if (entry.isSymbolicLink())
      throw new Error(
        `Encryption migration cannot include a symbolic link: ${relativePath}`,
      );
    if (entry.isDirectory()) {
      result.push(
        ...(await inventoryDirectory({
          ...input,
          directory: path,
        })),
      );
      continue;
    }
    if (!entry.isFile())
      throw new Error(
        `Encryption migration found an unsupported file: ${relativePath}`,
      );
    const checked = await fileChecksum(path);
    result.push({
      scope: input.scope,
      path: relativePath,
      sourcePath: path,
      journalSource:
        input.scope === "library"
          ? relativePath
          : `${SECURITY_DIRECTORY}/sources/cache/${relativePath}`,
      kind: entryKind(input.scope, relativePath),
      storage: storageKind(input.scope, relativePath),
      migrate: relativePath !== "metadata.json",
      ...checked,
    });
  }
  return result;
}

async function createInventory(
  context: SetupContext,
): Promise<InventoryEntry[]> {
  const [library, cache, indexStat] = await Promise.all([
    inventoryDirectory({ scope: "library", root: context.root }),
    inventoryDirectory({ scope: "cache", root: context.cacheRoot }),
    stat(context.indexPath),
  ]);
  if (!indexStat.isFile()) throw new Error("The Library index is not a file.");
  const indexChecksum = await fileChecksum(context.indexPath);
  const inventory: InventoryEntry[] = [
    ...library,
    ...cache,
    {
      scope: "index",
      path: "index.db",
      sourcePath: context.indexPath,
      journalSource: `${SECURITY_DIRECTORY}/sources/index.db`,
      kind: "index",
      storage: "index",
      migrate: true,
      ...indexChecksum,
    },
  ];
  return inventory.sort((left, right) =>
    `${left.scope}/${left.path}`.localeCompare(`${right.scope}/${right.path}`),
  );
}

function backupFile(backupPath: string, entry: BackupEntry): string {
  return join(backupPath, entry.scope, entry.path);
}

async function syncFile(path: string): Promise<void> {
  const handle = await open(path, "r");
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function syncDirectory(path: string): Promise<void> {
  try {
    const handle = await open(path, "r");
    try {
      await handle.sync();
    } finally {
      await handle.close();
    }
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error.code === "EINVAL" ||
        error.code === "ENOTSUP" ||
        error.code === "EISDIR" ||
        error.code === "EPERM")
    )
      return;
    throw error;
  }
}

async function createVerifiedBackup(input: {
  context: SetupContext;
  pending: PendingSetup;
  inventory: readonly InventoryEntry[];
}): Promise<void> {
  const finalPath = input.pending.backupPath;
  const existing = await lstat(finalPath).catch(() => null);
  if (existing) {
    await verifyBackup(finalPath, input.context.input.libraryId);
    return;
  }
  await mkdir(dirname(finalPath), { recursive: true });
  const staging = `${finalPath}.tmp-${process.pid}-${randomUUID()}`;
  await mkdir(staging, { recursive: false });
  try {
    for (const entry of input.inventory) {
      const destination = backupFile(staging, entry);
      await mkdir(dirname(destination), { recursive: true });
      await copyFile(entry.sourcePath, destination);
      await syncFile(destination);
    }
    const current = await createInventory(input.context);
    const unchanged =
      current.length === input.inventory.length &&
      current.every((entry, index) => {
        const original = input.inventory[index];
        return (
          original?.scope === entry.scope &&
          original.path === entry.path &&
          original.size === entry.size &&
          original.sha256 === entry.sha256
        );
      });
    if (!unchanged)
      throw new Error(
        "The Library changed while the encryption backup was created.",
      );
    await writeFile(
      join(staging, BACKUP_MANIFEST_FILENAME),
      JSON.stringify(
        {
          version: 1,
          libraryId: input.context.input.libraryId,
          migrationId: input.pending.migrationId,
          entries: input.inventory.map(
            ({ scope, path, size, sha256: digest, migrate }) => ({
              scope,
              path,
              size,
              sha256: digest,
              migrate,
            }),
          ),
        },
        null,
        2,
      ),
      { flag: "wx", mode: 0o600 },
    );
    await rename(staging, finalPath);
    await syncDirectory(dirname(finalPath));
    await verifyBackup(finalPath, input.context.input.libraryId);
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    throw error;
  }
}

async function verifyBackup(
  backupPath: string,
  libraryId: string,
): Promise<z.infer<typeof BackupManifestSchema>> {
  const manifest = BackupManifestSchema.parse(
    JSON.parse(
      await readFile(join(backupPath, BACKUP_MANIFEST_FILENAME), "utf8"),
    ),
  );
  if (manifest.libraryId !== libraryId)
    throw new Error("The encryption backup belongs to another Library.");
  for (const entry of manifest.entries) {
    const checked = await fileChecksum(backupFile(backupPath, entry));
    if (checked.size !== entry.size || checked.sha256 !== entry.sha256)
      throw new Error(
        `The encryption backup is incomplete or damaged: ${entry.scope}/${entry.path}`,
      );
  }
  return manifest;
}

function migrationEntryId(entry: InventoryEntry): string {
  return `${entry.scope}-${createHash("sha256")
    .update(entry.path)
    .digest("hex")
    .slice(0, 24)}`;
}

function plannedEntries(
  inventory: readonly InventoryEntry[],
): PlannedEncryptionMigrationEntry[] {
  return inventory
    .filter((entry) => entry.migrate)
    .map((entry) => {
      const id = migrationEntryId(entry);
      return {
        id,
        kind: entry.kind,
        source: entry.journalSource,
        destination: `${STAGING_DIRECTORY}/${id}.enc`,
        sourceChecksum: entry.sha256,
      };
    });
}

function assertJournalMatchesPlan(
  journal: EncryptionMigrationJournal,
  inventory: readonly InventoryEntry[],
): void {
  const expected = new Map(
    plannedEntries(inventory).map((entry) => [entry.id, entry]),
  );
  if (journal.entries.length !== expected.size)
    throw new Error("The encryption journal does not match the backup.");
  for (const entry of journal.entries) {
    const planned = expected.get(entry.id);
    if (
      !planned ||
      planned.kind !== entry.kind ||
      planned.source !== entry.source ||
      planned.destination !== entry.destination ||
      planned.sourceChecksum !== entry.checksums.source
    )
      throw new Error("The encryption journal does not match the backup.");
  }
}

function inventoryFromBackup(
  context: SetupContext,
  manifest: z.infer<typeof BackupManifestSchema>,
): InventoryEntry[] {
  return manifest.entries.map((entry) => ({
    ...entry,
    sourcePath:
      entry.scope === "library"
        ? join(context.root, entry.path)
        : entry.scope === "cache"
          ? join(context.cacheRoot, entry.path)
          : context.indexPath,
    journalSource:
      entry.scope === "library"
        ? entry.path
        : entry.scope === "cache"
          ? `${SECURITY_DIRECTORY}/sources/cache/${entry.path}`
          : `${SECURITY_DIRECTORY}/sources/index.db`,
    kind: entryKind(entry.scope, entry.path),
    storage: storageKind(entry.scope, entry.path),
  }));
}

async function verifyPlaintextSource(entry: InventoryEntry): Promise<void> {
  const checked = await fileChecksum(entry.sourcePath);
  if (checked.size !== entry.size || checked.sha256 !== entry.sha256)
    throw new Error(
      `Migration source changed after backup: ${entry.scope}/${entry.path}`,
    );
}

async function verifyEncryptedFile(
  entry: InventoryEntry,
  path: string,
): Promise<void> {
  const plaintext =
    entry.storage === "buffer"
      ? decodeLibraryFile(path, await readFile(path))
      : await readLibraryMedia(path);
  try {
    if (
      plaintext.byteLength !== entry.size ||
      sha256(plaintext) !== entry.sha256
    )
      throw new Error(
        `Encrypted migration output did not verify: ${entry.scope}/${entry.path}`,
      );
  } finally {
    plaintext.fill(0);
  }
}

async function migrateEntry(input: {
  context: SetupContext;
  store: EncryptionMigrationJournalStore;
  entry: InventoryEntry;
  destination: string;
}): Promise<void> {
  const id = migrationEntryId(input.entry);
  await input.store.startEntry(id);
  if (input.entry.storage === "index") {
    const key = deriveLibrarySubkey("database:index");
    try {
      await input.context.index.rekey(key);
      await input.context.index.checkpoint();
      await input.context.index.verify();
    } finally {
      key.fill(0);
    }
    const destinationChecksum = (await fileChecksum(input.context.indexPath))
      .sha256;
    await input.store.verifyEntry({ entryId: id, destinationChecksum });
    return;
  }

  await verifyPlaintextSource(input.entry);
  await mkdir(dirname(input.destination), { recursive: true });
  await rm(input.destination, { force: true });
  if (input.entry.storage === "buffer") {
    const plaintext = await readFile(input.entry.sourcePath);
    try {
      await writeFile(
        input.destination,
        encodeLibraryFile(input.destination, plaintext),
        { flag: "wx", mode: 0o600 },
      );
    } finally {
      plaintext.fill(0);
    }
  } else {
    await encryptLibraryMediaFile(input.entry.sourcePath, input.destination);
  }
  await verifyEncryptedFile(input.entry, input.destination);
  await input.store.verifyEntry({
    entryId: id,
    destinationChecksum: (await fileChecksum(input.destination)).sha256,
  });
}

async function sourceAlreadyCommitted(entry: InventoryEntry): Promise<boolean> {
  if (entry.storage === "buffer") {
    const value = await readFile(entry.sourcePath);
    return isEncryptedLibraryFile(value);
  }
  return isEncryptedLibraryMedia(entry.sourcePath);
}

async function commitMigratedFiles(input: {
  context: SetupContext;
  store: EncryptionMigrationJournalStore;
  inventory: readonly InventoryEntry[];
}): Promise<void> {
  const inspection = await input.store.inspect();
  for (const journalEntry of inspection.journal.entries) {
    const entry = input.inventory.find(
      (candidate) => migrationEntryId(candidate) === journalEntry.id,
    );
    if (!entry) throw new Error(`Migration inventory lost ${journalEntry.id}.`);
    if (entry.storage === "index") {
      await input.context.index.verify();
      continue;
    }
    const destination = join(input.context.root, journalEntry.destination);
    const destinationExists = await stat(destination).catch(() => null);
    if (destinationExists) {
      await verifyEncryptedFile(entry, destination);
      await mkdir(dirname(entry.sourcePath), { recursive: true });
      await rename(destination, entry.sourcePath);
    } else if (!(await sourceAlreadyCommitted(entry))) {
      throw new Error(`Migration output is missing: ${entry.path}`);
    }
    await verifyEncryptedFile(entry, entry.sourcePath);
  }
}

async function writeManifestAtomically(
  root: string,
  manifest: LibrarySecurityManifest,
): Promise<void> {
  const path = join(root, LIBRARY_SECURITY_MANIFEST_FILENAME);
  const temporary = `${path}.tmp-${process.pid}-${randomUUID()}`;
  const handle = await open(temporary, "wx", 0o600);
  try {
    await handle.writeFile(serializeLibrarySecurityManifest(manifest), "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await rename(temporary, path);
    await syncDirectory(root);
  } finally {
    await rm(temporary, { force: true });
  }
}

function defaultSecureStorage(): LibrarySecuritySecureStorage {
  return {
    get: getSecureSecret,
    set: setSecureSecret,
    delete: deleteSecret,
  };
}

function productionIndex(
  input: SetupLibrarySecurityInput,
): LibrarySecurityIndexMigration {
  const sqlite = input.indexConnection;
  if (!sqlite)
    throw new Error(
      "An index connection is required for Library security setup.",
    );
  return {
    checkpoint: async () => {
      sqlite.pragma("wal_checkpoint(TRUNCATE)");
    },
    rekey: async (key) => {
      rekeySqlCipher(sqlite, key);
    },
    verify: async () => {
      const integrity = sqlite.pragma("integrity_check", { simple: true });
      if (integrity !== "ok")
        throw new Error("The encrypted index is corrupt.");
    },
    restore: async (backupPath) => {
      if (sqlite.open) sqlite.close();
      await copyFile(backupPath, input.indexPath);
    },
  };
}

function setupContext(input: SetupLibrarySecurityInput): SetupContext {
  const root = resolve(input.libraryRoot);
  const cacheRoot = resolve(input.cacheRoot);
  const indexPath = resolve(input.indexPath);
  const backupPath =
    input.backupPath ??
    join(dirname(root), `${basename(root)}.pre-encryption-${input.libraryId}`);
  assertExternalBackup(backupPath, root, cacheRoot, indexPath);
  return {
    input: { ...input, backupPath },
    root,
    cacheRoot,
    indexPath,
    secureStorage: input.dependencies?.secureStorage ?? defaultSecureStorage(),
    index: input.dependencies?.index ?? productionIndex(input),
    pendingAccount: `${PENDING_ACCOUNT_PREFIX}:${input.libraryId}`,
    masterAccount: `${KEYCHAIN_LIBRARY_MASTER_KEY_PREFIX}:${input.libraryId}`,
  };
}

async function loadOrCreatePending(
  context: SetupContext,
): Promise<{ pending: PendingSetup; masterKey: Buffer; resumed: boolean }> {
  const serializedPending = await context.secureStorage.get(
    context.pendingAccount,
  );
  if (serializedPending) {
    const pending = PendingSetupSchema.parse(JSON.parse(serializedPending));
    const serializedKey = await context.secureStorage.get(
      context.masterAccount,
    );
    if (!serializedKey)
      throw new Error("The pending Library master key is missing.");
    const masterKey = Buffer.from(serializedKey, "base64");
    if (
      masterKey.byteLength !== LIBRARY_MASTER_KEY_BYTES ||
      masterKey.toString("base64") !== serializedKey
    ) {
      masterKey.fill(0);
      throw new Error("The pending Library master key is invalid.");
    }
    const unlocked = await unlockLibraryWithPassword(
      pending.manifest,
      context.input.password,
    );
    try {
      if (!unlocked.equals(masterKey))
        throw new Error("The pending Library master key does not match.");
    } finally {
      unlocked.fill(0);
    }
    return { pending, masterKey, resumed: true };
  }
  if (await context.secureStorage.get(context.masterAccount))
    throw new Error("A Library master key already exists without setup state.");

  const created = await createLibrarySecurity({
    libraryId: context.input.libraryId,
    password: context.input.password,
    passwordKdf: context.input.passwordKdf,
    recoveryKdf: context.input.recoveryKdf,
  });
  const pending = PendingSetupSchema.parse({
    version: 1,
    migrationId: randomUUID(),
    backupPath: context.input.backupPath,
    recoveryKey: created.recoveryKey,
    manifest: created.manifest,
  });
  try {
    await context.secureStorage.set(
      context.masterAccount,
      created.masterKey.toString("base64"),
    );
    await context.secureStorage.set(
      context.pendingAccount,
      JSON.stringify(pending),
    );
    return { pending, masterKey: created.masterKey, resumed: false };
  } catch (error) {
    await context.secureStorage.delete(context.masterAccount).catch(() => {});
    created.masterKey.fill(0);
    throw error;
  }
}

export async function setupLibrarySecurity(
  input: SetupLibrarySecurityInput,
): Promise<SetupLibrarySecurityResult> {
  const context = setupContext(input);
  const manifestPath = join(context.root, LIBRARY_SECURITY_MANIFEST_FILENAME);
  if (await stat(manifestPath).catch(() => null))
    throw new Error("Library security is already set up.");

  const { pending, masterKey, resumed } = await loadOrCreatePending(context);
  installLibraryKey(input.libraryId, masterKey, [
    context.root,
    context.cacheRoot,
  ]);
  masterKey.fill(0);
  let completed = false;
  try {
    await context.index.checkpoint();
    let backup = await lstat(pending.backupPath).catch(() => null);
    let inventory: InventoryEntry[];
    if (backup) {
      const backupManifest = await verifyBackup(
        pending.backupPath,
        input.libraryId,
      );
      inventory = inventoryFromBackup(context, backupManifest);
    } else {
      inventory = await createInventory(context);
      await createVerifiedBackup({ context, pending, inventory });
      backup = await lstat(pending.backupPath);
    }
    if (!backup.isDirectory())
      throw new Error("The encryption backup is not a directory.");

    const store = new EncryptionMigrationJournalStore({ root: context.root });
    const journalExists = await stat(store.journalPath).catch(() => null);
    if (!journalExists) {
      await store.create({
        migrationId: pending.migrationId,
        entries: plannedEntries(inventory),
      });
    }
    let inspection = await store.inspect();
    if (inspection.journal.migrationId !== pending.migrationId)
      throw new Error("The encryption journal does not match setup state.");
    assertJournalMatchesPlan(inspection.journal, inventory);
    if (inspection.action === "rollback")
      throw new Error("Encryption migration rollback must finish first.");
    if (inspection.journal.state === "rolled-back")
      throw new Error("The encryption migration was rolled back.");

    for (const journalEntry of inspection.journal.entries) {
      if (
        journalEntry.phase === "verified" ||
        journalEntry.phase === "committed"
      )
        continue;
      const entry = inventory.find(
        (candidate) => migrationEntryId(candidate) === journalEntry.id,
      );
      if (!entry)
        throw new Error(`Migration inventory lost ${journalEntry.id}.`);
      await migrateEntry({
        context,
        store,
        entry,
        destination: join(context.root, journalEntry.destination),
      });
    }

    inspection = await store.inspect();
    if (inspection.action === "commit") {
      await commitMigratedFiles({ context, store, inventory });
      await store.commit();
    } else if (inspection.journal.state !== "committed") {
      throw new Error("Encryption migration did not reach commit.");
    }
    await writeManifestAtomically(context.root, pending.manifest);
    await context.secureStorage.delete(context.pendingAccount).catch(() => {});
    completed = true;
    return {
      manifest: pending.manifest,
      recoveryKey: pending.recoveryKey,
      backupPath: pending.backupPath,
      resumed,
    };
  } finally {
    if (!completed) clearLibraryKey();
  }
}

export async function rollbackLibrarySecuritySetup(
  input: SetupLibrarySecurityInput & { reason: string },
): Promise<void> {
  const context = setupContext(input);
  const serializedPending = await context.secureStorage.get(
    context.pendingAccount,
  );
  if (!serializedPending)
    throw new Error("No Library security setup is pending.");
  const pending = PendingSetupSchema.parse(JSON.parse(serializedPending));
  const store = new EncryptionMigrationJournalStore({ root: context.root });
  const journalExists = await stat(store.journalPath).catch(() => null);
  if (!journalExists) {
    await context.secureStorage.delete(context.pendingAccount);
    await context.secureStorage.delete(context.masterAccount);
    clearLibraryKey();
    return;
  }
  const backup = await verifyBackup(pending.backupPath, input.libraryId);
  const inventory = inventoryFromBackup(context, backup);
  await store.beginRollback(input.reason);
  const inspection = await store.inspect();
  if (inspection.journal.migrationId !== pending.migrationId)
    throw new Error("The encryption journal does not match setup state.");
  assertJournalMatchesPlan(inspection.journal, inventory);
  for (const journalEntry of inspection.journal.entries) {
    if (journalEntry.phase === "rolled-back") continue;
    const entry = inventory.find(
      (candidate) => migrationEntryId(candidate) === journalEntry.id,
    );
    if (!entry) throw new Error(`Migration inventory lost ${journalEntry.id}.`);
    const sourceBackup = backupFile(pending.backupPath, entry);
    if (entry.storage === "index") {
      await context.index.restore(sourceBackup);
    } else {
      await mkdir(dirname(entry.sourcePath), { recursive: true });
      await copyFile(sourceBackup, entry.sourcePath);
    }
    await store.recordEntryRolledBack({
      entryId: journalEntry.id,
      restoredSourceChecksum: (await fileChecksum(entry.sourcePath)).sha256,
    });
  }
  await store.completeRollback();
  await context.secureStorage.delete(context.pendingAccount);
  await context.secureStorage.delete(context.masterAccount);
  clearLibraryKey();
}
