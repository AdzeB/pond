import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import type { FolderPasswordVerifier } from "@pond/schema/db";
import { folderSecurity, folders, saveFolders } from "@pond/schema/db";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../db";
import { resolvePaths } from "../../paths";
import { writeOrganizationBundle } from "../organization-bundle";

const FOLDER_PASSWORD_BYTES = 32;
const FOLDER_PASSWORD_SALT_BYTES = 16;
const FOLDER_PASSWORD_N = 32_768;
const FOLDER_PASSWORD_R = 8;
const FOLDER_PASSWORD_P = 1;

const FolderPasswordVerifierSchema = z.strictObject({
  algorithm: z.literal("scrypt"),
  version: z.literal(1),
  salt: z.string(),
  hash: z.string(),
  N: z.number().int().positive(),
  r: z.number().int().positive(),
  p: z.number().int().positive(),
});

const unlockedFolders = new Set<string>();

export interface FolderLockRow {
  id: string;
  parentId: string | null;
  passwordVerifier: FolderPasswordVerifier | null;
  lockChildren: boolean;
}

export async function createFolderPasswordVerifier(
  password: string,
): Promise<FolderPasswordVerifier> {
  if (!password) throw new Error("Password must not be empty.");
  const salt = randomBytes(FOLDER_PASSWORD_SALT_BYTES);
  const hash = await deriveFolderPassword(password, {
    N: FOLDER_PASSWORD_N,
    r: FOLDER_PASSWORD_R,
    p: FOLDER_PASSWORD_P,
    salt: salt.toString("base64"),
  });
  try {
    return {
      algorithm: "scrypt",
      version: 1,
      salt: salt.toString("base64"),
      hash: hash.toString("base64"),
      N: FOLDER_PASSWORD_N,
      r: FOLDER_PASSWORD_R,
      p: FOLDER_PASSWORD_P,
    };
  } finally {
    salt.fill(0);
    hash.fill(0);
  }
}

export async function verifyFolderPassword(
  password: string,
  raw: FolderPasswordVerifier,
): Promise<boolean> {
  const verifier = FolderPasswordVerifierSchema.parse(raw);
  const expected = Buffer.from(verifier.hash, "base64");
  const actual = await deriveFolderPassword(password, verifier);
  try {
    return (
      expected.byteLength === actual.byteLength &&
      timingSafeEqual(expected, actual)
    );
  } finally {
    expected.fill(0);
    actual.fill(0);
  }
}

export async function setFolderPassword(input: {
  folderId: string;
  password: string;
  currentPassword?: string;
  hint?: string | null;
  lockChildren?: boolean;
}): Promise<{ ok: boolean }> {
  const db = await getDb();
  const current = await db
    .select({ passwordVerifier: folderSecurity.passwordVerifier })
    .from(folderSecurity)
    .where(eq(folderSecurity.folderId, input.folderId))
    .get();
  if (
    current?.passwordVerifier &&
    !unlockedFolders.has(input.folderId) &&
    (!input.currentPassword ||
      !(await verifyFolderPassword(
        input.currentPassword,
        current.passwordVerifier,
      )))
  ) {
    return { ok: false };
  }
  const verifier = await createFolderPasswordVerifier(input.password);
  const existingFolder = await db
    .select({ id: folders.id })
    .from(folders)
    .where(eq(folders.id, input.folderId))
    .get();
  if (!existingFolder) return { ok: false };
  await db
    .insert(folderSecurity)
    .values({
      folderId: input.folderId,
      passwordVerifier: verifier,
      passwordHint: input.hint?.trim() || null,
      lockChildren: input.lockChildren ?? true,
    })
    .onConflictDoUpdate({
      target: folderSecurity.folderId,
      set: {
        passwordVerifier: verifier,
        passwordHint: input.hint?.trim() || null,
        lockChildren: input.lockChildren ?? true,
      },
    });
  unlockedFolders.add(input.folderId);
  writeOrganizationBundle(db, resolvePaths().libraryRoot);
  return { ok: true };
}

export async function removeFolderPassword(
  folderId: string,
  password?: string,
): Promise<{ ok: boolean }> {
  const db = await getDb();
  const current = await db
    .select({ passwordVerifier: folderSecurity.passwordVerifier })
    .from(folderSecurity)
    .where(eq(folderSecurity.folderId, folderId))
    .get();
  if (
    current?.passwordVerifier &&
    !unlockedFolders.has(folderId) &&
    (!password ||
      !(await verifyFolderPassword(password, current.passwordVerifier)))
  ) {
    return { ok: false };
  }
  const removed = await db
    .delete(folderSecurity)
    .where(eq(folderSecurity.folderId, folderId))
    .returning({ id: folderSecurity.folderId });
  unlockedFolders.delete(folderId);
  if (removed.length === 0) return { ok: false };
  writeOrganizationBundle(db, resolvePaths().libraryRoot);
  return { ok: true };
}

export async function unlockFolder(
  folderId: string,
  password: string,
): Promise<{ ok: boolean }> {
  const db = await getDb();
  const folder = await db
    .select({
      passwordVerifier: folderSecurity.passwordVerifier,
    })
    .from(folderSecurity)
    .where(eq(folderSecurity.folderId, folderId))
    .get();
  if (
    !folder?.passwordVerifier ||
    !(await verifyFolderPassword(password, folder.passwordVerifier))
  ) {
    return { ok: false };
  }
  unlockedFolders.add(folderId);
  return { ok: true };
}

export function lockFolder(folderId: string): void {
  unlockedFolders.delete(folderId);
}

export function clearFolderUnlockSessions(): void {
  unlockedFolders.clear();
}

export function computeLockedFolderIds(
  rows: readonly FolderLockRow[],
  unlocked: ReadonlySet<string> = unlockedFolders,
): Set<string> {
  const children = new Map<string | null, string[]>();
  const byId = new Map(rows.map((row) => [row.id, row]));
  for (const row of rows) {
    const list = children.get(row.parentId) ?? [];
    list.push(row.id);
    children.set(row.parentId, list);
  }

  const locked = new Set<string>();
  function lockDescendants(id: string): void {
    if (locked.has(id)) return;
    locked.add(id);
    for (const child of children.get(id) ?? []) lockDescendants(child);
  }
  for (const row of rows) {
    if (!row.passwordVerifier || unlocked.has(row.id)) continue;
    if (row.lockChildren) lockDescendants(row.id);
    else locked.add(row.id);
  }
  for (const id of locked) {
    if (!byId.has(id)) locked.delete(id);
  }
  return locked;
}

export async function lockedFolderIds(): Promise<Set<string>> {
  const db = await getDb();
  const rows = await db
    .select({
      id: folders.id,
      parentId: folders.parentId,
      passwordVerifier: folderSecurity.passwordVerifier,
      lockChildren: folderSecurity.lockChildren,
    })
    .from(folders)
    .leftJoin(folderSecurity, eq(folders.id, folderSecurity.folderId));
  return computeLockedFolderIds(
    rows.map((row) => ({
      ...row,
      lockChildren: row.lockChildren ?? true,
    })),
  );
}

export async function saveIsLocked(saveId: string): Promise<boolean> {
  const hidden = [...(await lockedFolderIds())];
  if (hidden.length === 0) return false;
  const db = await getDb();
  const membership = await db
    .select({ saveId: saveFolders.saveId })
    .from(saveFolders)
    .where(
      and(
        eq(saveFolders.saveId, saveId),
        inArray(saveFolders.folderId, hidden),
      ),
    )
    .get();
  return membership != null;
}

export async function folderSecurityList(): Promise<
  Array<{ folderId: string; lockChildren: boolean }>
> {
  const db = await getDb();
  return db
    .select({
      folderId: folderSecurity.folderId,
      lockChildren: folderSecurity.lockChildren,
    })
    .from(folderSecurity);
}

export async function folderSecurityStatus(folderId: string): Promise<{
  locked: boolean;
  protected: boolean;
  hint: string | null;
  lockChildren: boolean;
  unlockFolderId: string | null;
}> {
  const db = await getDb();
  const folderRows = await db
    .select({
      id: folders.id,
      parentId: folders.parentId,
      passwordVerifier: folderSecurity.passwordVerifier,
      passwordHint: folderSecurity.passwordHint,
      lockChildren: folderSecurity.lockChildren,
    })
    .from(folders)
    .leftJoin(folderSecurity, eq(folders.id, folderSecurity.folderId));
  const byId = new Map(folderRows.map((folder) => [folder.id, folder]));
  const folder = byId.get(folderId);
  const locked = await lockedFolderIds();
  let cursor = folder;
  let unlockFolderId: string | null = null;
  let hint = folder?.passwordHint ?? null;
  while (cursor) {
    if (
      cursor.passwordVerifier &&
      locked.has(cursor.id) &&
      (cursor.id === folderId || cursor.lockChildren)
    ) {
      unlockFolderId = cursor.id;
      hint = cursor.passwordHint;
      break;
    }
    cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined;
  }
  return {
    locked: locked.has(folderId),
    protected: folder?.passwordVerifier != null,
    hint,
    lockChildren: folder?.lockChildren ?? true,
    unlockFolderId,
  };
}

function deriveFolderPassword(
  password: string,
  input: { salt: string; N: number; r: number; p: number },
): Promise<Buffer> {
  const salt = Buffer.from(input.salt, "base64");
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      FOLDER_PASSWORD_BYTES,
      {
        N: input.N,
        r: input.r,
        p: input.p,
        maxmem: 128 * input.N * input.r + 8 * 1024 * 1024,
      },
      (error, result) => {
        salt.fill(0);
        if (error) reject(error);
        else resolve(result);
      },
    );
  });
}
