import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, rm, stat } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { z } from "zod";

const JOURNAL_VERSION = 1 as const;
const DEFAULT_JOURNAL_PATH = ".security/encryption-migration.json";

const ChecksumSchema = z
  .string()
  .regex(/^[a-f0-9]{64}$/, "Checksums must be lowercase SHA-256 values.");
const TimestampSchema = z.string().datetime();
const EntryPhaseSchema = z.enum([
  "planned",
  "in-progress",
  "verified",
  "committed",
  "rolled-back",
]);
const JournalStateSchema = z.enum([
  "planned",
  "in-progress",
  "verified",
  "committed",
  "rolled-back",
]);
const EntryKindSchema = z.enum([
  "item-file",
  "metadata",
  "index",
  "thumbnail",
  "chat",
  "settings",
  "organization",
  "backup",
  "other",
]);
const EntryRollbackSchema = z
  .object({
    fromPhase: z.enum(["planned", "in-progress", "verified"]),
    completedAt: TimestampSchema.nullable(),
    restoredSourceChecksum: ChecksumSchema.nullable(),
  })
  .strict();
const MigrationEntrySchema = z
  .object({
    id: z
      .string()
      .min(1)
      .max(128)
      .regex(/^[A-Za-z0-9._-]+$/),
    kind: EntryKindSchema,
    source: z.string().min(1),
    destination: z.string().min(1),
    checksums: z
      .object({
        source: ChecksumSchema,
        destination: ChecksumSchema.nullable(),
      })
      .strict(),
    phase: EntryPhaseSchema,
    rollback: EntryRollbackSchema.nullable(),
    updatedAt: TimestampSchema,
  })
  .strict();
const RollbackSchema = z
  .object({
    reason: z.string().min(1).max(1_000),
    startedAt: TimestampSchema,
    completedAt: TimestampSchema.nullable(),
  })
  .strict();
const EncryptionMigrationJournalSchema = z
  .object({
    version: z.literal(JOURNAL_VERSION),
    migrationId: z
      .string()
      .min(1)
      .max(128)
      .regex(/^[A-Za-z0-9._-]+$/),
    state: JournalStateSchema,
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
    entries: z.array(MigrationEntrySchema).min(1),
    rollback: RollbackSchema.nullable(),
  })
  .strict();
const JournalEnvelopeSchema = z
  .object({
    journal: EncryptionMigrationJournalSchema,
    integrity: z
      .object({
        algorithm: z.literal("sha256"),
        digest: ChecksumSchema,
      })
      .strict(),
  })
  .strict();

export type EncryptionMigrationEntryKind = z.infer<typeof EntryKindSchema>;
export type EncryptionMigrationEntryPhase = z.infer<typeof EntryPhaseSchema>;
export type EncryptionMigrationJournal = z.infer<
  typeof EncryptionMigrationJournalSchema
>;
export interface PlannedEncryptionMigrationEntry {
  id: string;
  kind: EncryptionMigrationEntryKind;
  source: string;
  destination: string;
  sourceChecksum: string;
}

export interface EncryptionMigrationResumeInspection {
  action: "start" | "resume" | "commit" | "complete" | "rollback";
  journal: EncryptionMigrationJournal;
  pendingEntryIds: string[];
  inProgressEntryIds: string[];
  verifiedEntryIds: string[];
  rolledBackEntryIds: string[];
}

interface JournalLocation {
  root: string;
  journalPath: string;
}

interface JournalStoreOptions {
  root: string;
  journalPath?: string;
  now?: () => Date;
}

function checksum(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function journalDigest(journal: EncryptionMigrationJournal): string {
  return checksum(JSON.stringify(journal));
}

function containedPath(root: string, path: string, label: string): string {
  if (path.includes("\0") || isAbsolute(path))
    throw new Error(`${label} must be a relative path inside the library.`);
  const absoluteRoot = resolve(root);
  const absolutePath = resolve(absoluteRoot, path);
  const relativePath = relative(absoluteRoot, absolutePath);
  if (
    !relativePath ||
    isAbsolute(relativePath) ||
    relativePath === ".." ||
    relativePath.startsWith(`..${sep}`)
  )
    throw new Error(`${label} must be a relative path inside the library.`);
  return absolutePath;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT")
      return false;
    throw error;
  }
}

function unsupportedDirectorySync(error: Error): boolean {
  if (!("code" in error)) return false;
  return (
    error.code === "EINVAL" ||
    error.code === "ENOTSUP" ||
    error.code === "EISDIR" ||
    error.code === "EPERM"
  );
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
    if (error instanceof Error && unsupportedDirectorySync(error)) return;
    throw error;
  }
}

function validatePaths(
  root: string,
  journal: EncryptionMigrationJournal,
): void {
  const seenIds = new Set<string>();
  for (const entry of journal.entries) {
    if (seenIds.has(entry.id))
      throw new Error(`Migration entry ID "${entry.id}" is duplicated.`);
    seenIds.add(entry.id);
    const source = containedPath(root, entry.source, "Migration source");
    const destination = containedPath(
      root,
      entry.destination,
      "Migration destination",
    );
    if (source === destination)
      throw new Error("Migration source and destination paths must differ.");
  }
}

function assertJournalInvariants(journal: EncryptionMigrationJournal): void {
  const allPhases = (phase: EncryptionMigrationEntryPhase): boolean =>
    journal.entries.every((entry) => entry.phase === phase);
  if (journal.state === "planned" && !allPhases("planned"))
    throw new Error("A planned migration can only contain planned entries.");
  if (journal.state === "verified" && !allPhases("verified"))
    throw new Error("A verified migration requires every entry to verify.");
  if (journal.state === "committed" && !allPhases("committed"))
    throw new Error("A committed migration requires every entry to commit.");
  if (journal.state === "rolled-back" && !allPhases("rolled-back"))
    throw new Error(
      "A rolled-back migration requires every entry to roll back.",
    );
  if (
    journal.state !== "committed" &&
    journal.entries.some((entry) => entry.phase === "committed")
  )
    throw new Error("Committed entries require a committed migration.");
  if (
    journal.rollback === null &&
    journal.entries.some((entry) => entry.rollback !== null)
  )
    throw new Error("Entry rollback metadata requires a journal rollback.");
  if (
    journal.rollback !== null &&
    journal.entries.some((entry) => entry.rollback === null)
  )
    throw new Error("A journal rollback requires metadata for every entry.");
  if (journal.state === "rolled-back" && journal.rollback?.completedAt === null)
    throw new Error("A rolled-back migration requires completion metadata.");
  if (
    journal.state !== "rolled-back" &&
    journal.rollback?.completedAt !== null &&
    journal.rollback !== null
  )
    throw new Error("Only a rolled-back migration can complete rollback.");
  if (
    journal.rollback !== null &&
    journal.state !== "in-progress" &&
    journal.state !== "rolled-back"
  )
    throw new Error(
      "Rollback metadata requires an active or completed rollback.",
    );
  for (const entry of journal.entries) {
    if (entry.phase === "verified" && entry.checksums.destination === null)
      throw new Error("Verified entries require a destination checksum.");
    if (entry.phase === "committed" && entry.checksums.destination === null)
      throw new Error("Committed entries require a destination checksum.");
    if (entry.phase === "rolled-back" && entry.rollback?.completedAt == null)
      throw new Error("Rolled-back entries require completion metadata.");
  }
}

function parseEnvelope(
  root: string,
  serialized: string,
): EncryptionMigrationJournal {
  const envelope = JournalEnvelopeSchema.parse(JSON.parse(serialized));
  if (journalDigest(envelope.journal) !== envelope.integrity.digest)
    throw new Error("Encryption migration journal integrity check failed.");
  validatePaths(root, envelope.journal);
  assertJournalInvariants(envelope.journal);
  return envelope.journal;
}

function serializeJournal(journal: EncryptionMigrationJournal): string {
  return JSON.stringify(
    {
      journal,
      integrity: {
        algorithm: "sha256",
        digest: journalDigest(journal),
      },
    },
    null,
    2,
  );
}

function resolveLocation(options: JournalStoreOptions): JournalLocation {
  const root = resolve(options.root);
  const journalPath = containedPath(
    root,
    options.journalPath ?? DEFAULT_JOURNAL_PATH,
    "Journal path",
  );
  return { root, journalPath };
}

function migrationEntry(
  journal: EncryptionMigrationJournal,
  entryId: string,
): EncryptionMigrationJournal["entries"][number] {
  const entry = journal.entries.find((candidate) => candidate.id === entryId);
  if (!entry) throw new Error(`Migration entry "${entryId}" was not found.`);
  return entry;
}

function rollbackSourcePhase(
  phase: EncryptionMigrationEntryPhase,
): z.infer<typeof EntryRollbackSchema>["fromPhase"] {
  if (phase === "planned" || phase === "in-progress" || phase === "verified")
    return phase;
  throw new Error(`Migration entry in phase "${phase}" cannot roll back.`);
}

export class EncryptionMigrationJournalStore {
  readonly root: string;
  readonly journalPath: string;
  readonly #now: () => Date;
  #pendingWrite: Promise<void> = Promise.resolve();

  constructor(options: JournalStoreOptions) {
    const location = resolveLocation(options);
    this.root = location.root;
    this.journalPath = location.journalPath;
    this.#now = options.now ?? (() => new Date());
  }

  async create(input: {
    migrationId: string;
    entries: readonly PlannedEncryptionMigrationEntry[];
  }): Promise<EncryptionMigrationJournal> {
    return this.#mutate(async () => {
      if (await pathExists(this.journalPath))
        throw new Error("An encryption migration journal already exists.");
      const timestamp = this.#timestamp();
      const journal = EncryptionMigrationJournalSchema.parse({
        version: JOURNAL_VERSION,
        migrationId: input.migrationId,
        state: "planned",
        createdAt: timestamp,
        updatedAt: timestamp,
        entries: input.entries.map((entry) => ({
          id: entry.id,
          kind: entry.kind,
          source: entry.source,
          destination: entry.destination,
          checksums: {
            source: entry.sourceChecksum,
            destination: null,
          },
          phase: "planned",
          rollback: null,
          updatedAt: timestamp,
        })),
        rollback: null,
      });
      validatePaths(this.root, journal);
      assertJournalInvariants(journal);
      await this.#write(journal);
      return journal;
    });
  }

  async inspect(): Promise<EncryptionMigrationResumeInspection> {
    await this.#pendingWrite;
    const journal = await this.#read();
    const rollbackActive =
      journal.rollback !== null && journal.state !== "rolled-back";
    const action =
      journal.state === "committed" || journal.state === "rolled-back"
        ? "complete"
        : rollbackActive
          ? "rollback"
          : journal.state === "verified"
            ? "commit"
            : journal.state === "planned"
              ? "start"
              : "resume";
    return {
      action,
      journal,
      pendingEntryIds: journal.entries
        .filter((entry) => entry.phase === "planned")
        .map((entry) => entry.id),
      inProgressEntryIds: journal.entries
        .filter((entry) => entry.phase === "in-progress")
        .map((entry) => entry.id),
      verifiedEntryIds: journal.entries
        .filter((entry) => entry.phase === "verified")
        .map((entry) => entry.id),
      rolledBackEntryIds: journal.entries
        .filter((entry) => entry.phase === "rolled-back")
        .map((entry) => entry.id),
    };
  }

  async startEntry(entryId: string): Promise<EncryptionMigrationJournal> {
    return this.#update((journal) => {
      if (journal.rollback !== null)
        throw new Error("Migration work cannot start during rollback.");
      if (journal.state === "verified" || journal.state === "committed")
        throw new Error("Migration work cannot start after verification.");
      const entry = migrationEntry(journal, entryId);
      if (entry.phase === "in-progress") return journal;
      if (entry.phase !== "planned")
        throw new Error(`Migration entry "${entryId}" cannot start.`);
      const timestamp = this.#timestamp();
      journal.entries = journal.entries.map((candidate) =>
        candidate.id === entryId
          ? {
              ...candidate,
              phase: "in-progress",
              updatedAt: timestamp,
            }
          : candidate,
      );
      journal.state = "in-progress";
      journal.updatedAt = timestamp;
      return journal;
    });
  }

  async verifyEntry(input: {
    entryId: string;
    destinationChecksum: string;
  }): Promise<EncryptionMigrationJournal> {
    return this.#update((journal) => {
      if (journal.rollback !== null)
        throw new Error("Migration work cannot verify during rollback.");
      const entry = migrationEntry(journal, input.entryId);
      if (entry.phase === "verified") {
        if (entry.checksums.destination !== input.destinationChecksum)
          throw new Error(
            `Migration entry "${input.entryId}" has a different verified checksum.`,
          );
        return journal;
      }
      if (entry.phase !== "in-progress")
        throw new Error(
          `Migration entry "${input.entryId}" must be in progress before verification.`,
        );
      const destinationChecksum = ChecksumSchema.parse(
        input.destinationChecksum,
      );
      const timestamp = this.#timestamp();
      journal.entries = journal.entries.map((candidate) =>
        candidate.id === input.entryId
          ? {
              ...candidate,
              checksums: {
                ...candidate.checksums,
                destination: destinationChecksum,
              },
              phase: "verified",
              updatedAt: timestamp,
            }
          : candidate,
      );
      journal.state = journal.entries.every(
        (candidate) => candidate.phase === "verified",
      )
        ? "verified"
        : "in-progress";
      journal.updatedAt = timestamp;
      return journal;
    });
  }

  async commit(): Promise<EncryptionMigrationJournal> {
    return this.#update((journal) => {
      if (journal.state === "committed") return journal;
      if (
        journal.state !== "verified" ||
        !journal.entries.every((entry) => entry.phase === "verified")
      )
        throw new Error(
          "Encryption migration cannot commit until every entry verifies.",
        );
      const timestamp = this.#timestamp();
      journal.entries = journal.entries.map((entry) => ({
        ...entry,
        phase: "committed",
        updatedAt: timestamp,
      }));
      journal.state = "committed";
      journal.updatedAt = timestamp;
      return journal;
    });
  }

  async beginRollback(reason: string): Promise<EncryptionMigrationJournal> {
    return this.#update((journal) => {
      if (journal.state === "committed")
        throw new Error("A committed encryption migration cannot roll back.");
      if (journal.state === "rolled-back") return journal;
      if (journal.rollback !== null) {
        if (journal.rollback.reason !== reason)
          throw new Error("Encryption migration rollback already started.");
        return journal;
      }
      const timestamp = this.#timestamp();
      journal.entries = journal.entries.map((entry) => {
        const completedAt = entry.phase === "planned" ? timestamp : null;
        return {
          ...entry,
          phase: entry.phase === "planned" ? "rolled-back" : entry.phase,
          rollback: {
            fromPhase: rollbackSourcePhase(entry.phase),
            completedAt,
            restoredSourceChecksum: null,
          },
          updatedAt: completedAt ?? entry.updatedAt,
        };
      });
      journal.rollback = {
        reason,
        startedAt: timestamp,
        completedAt: null,
      };
      journal.state = "in-progress";
      journal.updatedAt = timestamp;
      return journal;
    });
  }

  async recordEntryRolledBack(input: {
    entryId: string;
    restoredSourceChecksum: string;
  }): Promise<EncryptionMigrationJournal> {
    return this.#update((journal) => {
      if (journal.rollback === null)
        throw new Error("Encryption migration rollback has not started.");
      const entry = migrationEntry(journal, input.entryId);
      const restoredSourceChecksum = ChecksumSchema.parse(
        input.restoredSourceChecksum,
      );
      if (restoredSourceChecksum !== entry.checksums.source)
        throw new Error(
          `Migration entry "${input.entryId}" did not restore its source checksum.`,
        );
      if (entry.phase === "rolled-back") {
        if (
          entry.rollback?.restoredSourceChecksum !== null &&
          entry.rollback?.restoredSourceChecksum !== restoredSourceChecksum
        )
          throw new Error(
            `Migration entry "${input.entryId}" has different rollback metadata.`,
          );
        return journal;
      }
      const rollback = entry.rollback;
      if (rollback === null)
        throw new Error(
          `Migration entry "${input.entryId}" has no rollback metadata.`,
        );
      const timestamp = this.#timestamp();
      journal.entries = journal.entries.map((candidate) =>
        candidate.id === input.entryId
          ? {
              ...candidate,
              phase: "rolled-back",
              rollback: {
                ...rollback,
                completedAt: timestamp,
                restoredSourceChecksum,
              },
              updatedAt: timestamp,
            }
          : candidate,
      );
      journal.updatedAt = timestamp;
      return journal;
    });
  }

  async completeRollback(): Promise<EncryptionMigrationJournal> {
    return this.#update((journal) => {
      if (journal.state === "rolled-back") return journal;
      if (journal.rollback === null)
        throw new Error("Encryption migration rollback has not started.");
      if (!journal.entries.every((entry) => entry.phase === "rolled-back"))
        throw new Error(
          "Encryption migration rollback cannot complete until every entry is restored.",
        );
      const timestamp = this.#timestamp();
      journal.rollback = {
        ...journal.rollback,
        completedAt: timestamp,
      };
      journal.state = "rolled-back";
      journal.updatedAt = timestamp;
      return journal;
    });
  }

  async #read(): Promise<EncryptionMigrationJournal> {
    return parseEnvelope(this.root, await readFile(this.journalPath, "utf8"));
  }

  async #update(
    transform: (
      journal: EncryptionMigrationJournal,
    ) => EncryptionMigrationJournal,
  ): Promise<EncryptionMigrationJournal> {
    return this.#mutate(async () => {
      const journal = EncryptionMigrationJournalSchema.parse(
        transform(await this.#read()),
      );
      validatePaths(this.root, journal);
      assertJournalInvariants(journal);
      await this.#write(journal);
      return journal;
    });
  }

  async #mutate<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.#pendingWrite;
    let release: (() => void) | undefined;
    this.#pendingWrite = new Promise<void>((resolvePending) => {
      release = resolvePending;
    });
    await previous;
    try {
      return await operation();
    } finally {
      release?.();
    }
  }

  async #write(journal: EncryptionMigrationJournal): Promise<void> {
    const directory = dirname(this.journalPath);
    await mkdir(directory, { recursive: true });
    const temporaryPath = `${this.journalPath}.tmp-${process.pid}-${randomUUID()}`;
    const handle = await open(temporaryPath, "wx", 0o600);
    try {
      await handle.writeFile(serializeJournal(journal), "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    try {
      await rename(temporaryPath, this.journalPath);
      await syncDirectory(directory);
    } finally {
      await rm(temporaryPath, { force: true });
    }
  }

  #timestamp(): string {
    return this.#now().toISOString();
  }
}
