import { createReadStream, existsSync } from "node:fs";
import {
  cp,
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  stat,
} from "node:fs/promises";
import { join, relative } from "node:path";
import { saves, settings as settingsTable } from "@pond/schema/db";
import type { Transaction } from "@pond/schema/tx";
import { isNotNull, eq } from "drizzle-orm";
import log from "electron-log/main.js";
import { getDb, getGlobalDb } from "../db";
import { readItemMetadata } from "../lib/library";
import {
  checkPointerSafety,
  detectCloudKind,
  probeExistingLibrary,
  readLibraryPointer,
  writeLibraryPointer,
} from "../lib/library-pointer";
import { libraryRoot, resolvePaths, trashRoot } from "../paths";
import { executeBatch } from "./executor";
import { recordForUndo } from "./undo";

interface IntegrityReport {
  orphans: string[];
  missing: string[];
  errors: Record<string, string>;
  totalIndexed: number;
  totalOnDisk: number;
}

export async function verifyLibraryIntegrity(): Promise<IntegrityReport> {
  const db = await getDb();
  const indexed = (await db.select({ id: saves.id }).from(saves)).map(
    (r) => r.id,
  );
  const indexedSet = new Set(indexed);

  const paths = resolvePaths();
  let entries: string[] = [];
  try {
    entries = await readdir(paths.itemsDir);
  } catch {
    /* libraryRoot/items missing; leave entries empty */
  }
  const onDiskIds = entries
    .filter((e) => e.endsWith(".info"))
    .map((e) => e.slice(0, -".info".length));
  const onDiskSet = new Set(onDiskIds);

  const orphans: string[] = [];
  const errors: Record<string, string> = {};
  for (const id of onDiskIds) {
    if (!indexedSet.has(id)) {
      const meta = await readItemMetadata(id);
      if (!meta) {
        errors[id] = "info.json missing or unreadable";
        continue;
      }
      orphans.push(id);
    }
  }

  const missing = indexed.filter((id) => !onDiskSet.has(id));

  return {
    orphans,
    missing,
    errors,
    totalIndexed: indexed.length,
    totalOnDisk: onDiskIds.length,
  };
}

export type RelocateMode = "copy" | "adopt";

interface RelocateResult {
  path: string;
  mode: RelocateMode;
  copied: number;
  skipped: number;
}

// copy: clone the current library into dest then switch (source left intact).
// adopt: just switch to dest, which already holds a Pond library.
export async function relocateLibrary(
  dest: string,
  mode: RelocateMode,
): Promise<RelocateResult> {
  const src = libraryRoot();
  const srcResolved = src.replace(/\/$/, "");
  const destResolved = dest.replace(/\/$/, "");
  if (srcResolved === destResolved) {
    return { path: src, mode, copied: 0, skipped: 0 };
  }

  const safety = checkPointerSafety(destResolved);
  if (!safety.ok) {
    throw new Error(`destination rejected: ${safety.reason ?? "unknown"}`);
  }
  if (!existsSync(destResolved)) {
    await mkdir(destResolved, { recursive: true });
  }

  let copied = 0;
  let skipped = 0;

  if (mode === "copy") {
    for (const entry of await readdir(srcResolved)) {
      const from = join(srcResolved, entry);
      const to = join(destResolved, entry);
      if (existsSync(to)) {
        log.warn("[pond library-ops] destination already has", entry);
        skipped += 1;
        continue;
      }
      await cp(from, to, { recursive: true });
      copied += 1;
    }
  }

  // Persist to the global DB first so a failed write never leaves the pointer
  // ahead of the in-memory path cache (which reads the pointer on resolve).
  const globalDb = await getGlobalDb();
  await globalDb
    .insert(settingsTable)
    .values({ id: "singleton", libraryRoot: destResolved })
    .onConflictDoUpdate({
      target: settingsTable.id,
      set: { libraryRoot: destResolved, updatedAt: new Date() },
    })
    .run();

  writeLibraryPointer(destResolved);

  log.info(
    `[pond library-ops] library ${mode === "copy" ? "copied" : "adopted"} → ${destResolved} (copied ${copied}, skipped ${skipped})`,
  );
  return { path: destResolved, mode, copied, skipped };
}

// Keep the on-disk pointer and global DB library_root aligned. The pointer is
// authoritative for resolvePaths(); repair drift left by a partial switch.
export async function syncLibraryRootMetadata(): Promise<void> {
  const pointer = readLibraryPointer()?.replace(/\/+$/, "");
  if (!pointer) return;

  const globalDb = await getGlobalDb();
  const rows = await globalDb
    .select({ libraryRoot: settingsTable.libraryRoot })
    .from(settingsTable)
    .where(eq(settingsTable.id, "singleton"));
  const stored = rows[0]?.libraryRoot?.replace(/\/+$/, "") ?? "";
  if (stored === pointer) return;

  await globalDb
    .insert(settingsTable)
    .values({ id: "singleton", libraryRoot: pointer })
    .onConflictDoUpdate({
      target: settingsTable.id,
      set: { libraryRoot: pointer, updatedAt: new Date() },
    })
    .run();
  log.info("[pond library-ops] repaired library_root metadata drift", {
    pointer,
    stored: stored || null,
  });
}

// Inspect a candidate folder for the relocate confirm dialog.
interface RelocatePreview {
  currentPath: string;
  candidatePath: string;
  samePath: boolean;
  safety: {
    ok: boolean;
    reason: string | null;
  };
  cloudKind: string | null;
  existing: ReturnType<typeof probeExistingLibrary>;
  suggestedMode: RelocateMode;
}

export function previewRelocate(candidate: string): RelocatePreview {
  const current = libraryRoot();
  const candidateResolved = candidate.replace(/\/$/, "");
  const samePath =
    current.replace(/\/$/, "") === candidateResolved.replace(/\/$/, "");
  const safety = checkPointerSafety(candidateResolved);
  const existing = probeExistingLibrary(candidateResolved);
  const cloudKind = detectCloudKind(candidateResolved);
  return {
    currentPath: current,
    candidatePath: candidateResolved,
    samePath,
    safety: { ok: safety.ok, reason: safety.reason ?? null },
    cloudKind,
    existing,
    suggestedMode: existing.looksLikePondLibrary ? "adopt" : "copy",
  };
}

export async function emptyTrashOlderThan(days: number): Promise<number> {
  const db = await getDb();
  const cutoff = days > 0 ? Date.now() - days * 86_400_000 : null;
  const all = await db.select().from(saves).where(isNotNull(saves.deletedAt));
  const targets = cutoff
    ? all.filter((r) => r.deletedAt && r.deletedAt.getTime() <= cutoff)
    : all;
  if (targets.length === 0) return 0;
  const txs: Transaction[] = targets.map((r) => ({
    kind: "purge",
    model: "save",
    id: r.id,
    before: r,
    meta: { actor: "system", actorReason: "trash-auto-empty" },
  }));
  await executeBatch(txs);
  for (const tx of txs) recordForUndo(tx);
  return txs.length;
}

export async function purgeLibrarySubdir(
  subdir: string,
  predicate?: (filename: string) => boolean,
): Promise<number> {
  const target = join(libraryRoot(), subdir);
  if (!existsSync(target)) return 0;
  let removed = 0;
  for (const entry of await readdir(target)) {
    if (predicate && !predicate(entry)) continue;
    await rm(join(target, entry), { recursive: true, force: true });
    removed += 1;
  }
  return removed;
}

void readFile;
void rename;
void stat;
void createReadStream;
void trashRoot;
void relative;
