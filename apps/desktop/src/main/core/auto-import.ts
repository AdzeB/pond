import { type FSWatcher, watch } from "node:fs";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import log from "electron-log/main.js";
import { libraryRoot } from "../paths";
import { createManualSave } from "./manual-import";
import { getPrefs } from "./prefs";

interface AutoImportLog {
  entries: Array<{
    at: number;
    name: string;
    mode: "copy" | "move";
    ok: boolean;
    id?: string;
  }>;
}

let watcher: FSWatcher | null = null;
const seen = new Set<string>();
const pending = new Map<string, ReturnType<typeof setTimeout>>();

function logPath(): string {
  return join(libraryRoot(), "auto-import-log.json");
}

async function appendLog(
  entry: AutoImportLog["entries"][number],
): Promise<void> {
  let doc: AutoImportLog = { entries: [] };
  try {
    doc = JSON.parse(await readFile(logPath(), "utf8")) as AutoImportLog;
  } catch {}
  doc.entries = [entry, ...(doc.entries ?? [])].slice(0, 200);
  await mkdir(libraryRoot(), { recursive: true }).catch(() => {});
  await writeFile(logPath(), JSON.stringify(doc, null, 2));
}

export async function readAutoImportLog(): Promise<AutoImportLog> {
  try {
    return JSON.parse(await readFile(logPath(), "utf8")) as AutoImportLog;
  } catch {
    return { entries: [] };
  }
}

async function ingest(path: string, mode: "copy" | "move"): Promise<void> {
  if (seen.has(path)) return;
  seen.add(path);
  const name = basename(path);
  try {
    const res = await createManualSave({ filePaths: [path], title: name });
    if (mode === "move" && res.ok) await unlink(path).catch(() => {});
    await appendLog({
      at: Date.now(),
      name,
      mode,
      ok: Boolean(res.ok),
      id: res.id,
    });
  } catch (err) {
    log.warn("[pond auto-import] failed", path, err);
    seen.delete(path);
    await appendLog({ at: Date.now(), name, mode, ok: false });
  }
}

function queue(path: string, mode: "copy" | "move"): void {
  const prior = pending.get(path);
  if (prior) clearTimeout(prior);
  pending.set(
    path,
    setTimeout(() => {
      pending.delete(path);
      void ingest(path, mode);
    }, 400),
  );
}

export async function startAutoImport(): Promise<void> {
  stopAutoImport();
  const prefs = await getPrefs().catch(() => null);
  const cfg = prefs?.autoImport;
  if (!cfg?.enabled || !cfg.path) return;
  try {
    watcher = watch(cfg.path, (_event, filename) => {
      if (!filename) return;
      queue(join(cfg.path, filename), cfg.mode);
    });
    log.info("[pond auto-import] watching", cfg.path);
  } catch (err) {
    log.warn("[pond auto-import] watch failed", err);
  }
}

export function stopAutoImport(): void {
  watcher?.close();
  watcher = null;
  for (const timer of pending.values()) clearTimeout(timer);
  pending.clear();
}
