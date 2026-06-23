import { libraryViewContext } from "@/stores/library-view-context";
import { pool } from "@/stores/pool";
import { selection } from "@/stores/selection";
import { mergeUniqueTags } from "@/stores/tag-clipboard";
import { pushToast } from "@/stores/toasts";
import {
  purgeSaves,
  setSaveTags,
  trashSaves,
  untrashSaves,
} from "./mutate-save";
import type { Save } from "./types";

function pluralize(
  n: number,
  singular: string,
  plural = `${singular}s`,
): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

function resolve(ids: readonly string[]): Save[] {
  const out: Save[] = [];
  for (const id of ids) {
    const save = pool.get(id);
    if (save) out.push(save);
  }
  return out;
}

async function writeClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// --- Selection set helpers -------------------------------------------------

export function selectAllInView(): void {
  selection.set(libraryViewContext.filteredIds());
}

export function invertSelectionInView(): void {
  const all = libraryViewContext.filteredIds();
  const current = new Set(selection.snapshot());
  selection.set(all.filter((id) => !current.has(id)));
}

export function isAllSelected(): boolean {
  const all = libraryViewContext.filteredIds();
  return all.length > 0 && selection.size() >= all.length;
}

// --- Pipeline ---------------------------------------------------------------

// Ids in the set whose ingest ended in `failed` — the subset "Retry failed" acts on.
export function failedIdsIn(ids: readonly string[]): string[] {
  return resolve(ids)
    .filter((s) => s.status === "failed")
    .map((s) => s.id);
}

// Re-run only the failed saves in the selection; complete and in-progress saves
// are left untouched. The main process resets each save's failed tasks and
// flips it back to ingesting, broadcasting the change to the pool.
export async function retryFailedSelection(
  ids: readonly string[],
): Promise<void> {
  const failed = failedIdsIn(ids);
  if (failed.length === 0) {
    pushToast("No failed items in selection.");
    return;
  }
  const result = (await window.pond.query("saves.retryFailed", {
    ids: failed,
  })) as { ok: boolean; requeued: number };
  if (!result.ok || result.requeued === 0) {
    pushToast("Couldn't retry failed items.", "error");
    return;
  }
  pushToast(`Retrying ${pluralize(result.requeued, "failed item")}.`, {
    tone: "success",
  });
}

// Re-run every failed save in the library (not just a selection). Used by the
// sync page's "Retry failed" action.
export async function retryAllFailed(): Promise<void> {
  const result = (await window.pond.query("saves.retryFailed", {})) as {
    ok: boolean;
    requeued: number;
  };
  if (!result.ok || result.requeued === 0) {
    pushToast("No failed saves to retry.");
    return;
  }
  pushToast(`Retrying ${pluralize(result.requeued, "failed save")}.`, {
    tone: "success",
  });
}

// --- Destructive ------------------------------------------------------------

export async function trashSelection(ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return;
  const snapshot = [...ids];
  const count = await trashSaves(snapshot);
  selection.clear();
  if (count === 0) return;
  pushToast(`Moved ${pluralize(count, "item")} to Trash.`, {
    action: {
      label: "Undo",
      onAction: () => void untrashSaves(snapshot),
    },
  });
}

export async function restoreSelection(ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return;
  const snapshot = [...ids];
  const count = await untrashSaves(snapshot);
  selection.clear();
  if (count === 0) return;
  pushToast(`Restored ${pluralize(count, "item")}.`, {
    tone: "success",
    action: {
      label: "Undo",
      onAction: () => void trashSaves(snapshot),
    },
  });
}

export async function deleteSelectionForever(
  ids: readonly string[],
): Promise<void> {
  if (ids.length === 0) return;
  const count = await purgeSaves([...ids]);
  selection.clear();
  if (count === 0) return;
  pushToast(`Deleted ${pluralize(count, "item")} forever.`);
}

// --- Tagging ----------------------------------------------------------------

export async function addTagToSelection(
  ids: readonly string[],
  tag: string,
): Promise<void> {
  const clean = tag.trim();
  if (!clean) return;
  const saves = resolve(ids);
  let changed = 0;
  for (const save of saves) {
    const next = mergeUniqueTags(save.tags, [clean]);
    if (next.length === save.tags.length) continue;
    await setSaveTags(save.id, next);
    changed++;
  }
  if (changed === 0) {
    pushToast(`All selected already tagged “${clean}”.`);
    return;
  }
  pushToast(`Tagged ${pluralize(changed, "item")} “${clean}”.`, {
    tone: "success",
  });
}

export async function pasteTagsToSelection(
  ids: readonly string[],
  tags: readonly string[],
): Promise<void> {
  if (tags.length === 0) return;
  const saves = resolve(ids);
  let changed = 0;
  for (const save of saves) {
    const next = mergeUniqueTags(save.tags, tags);
    if (next.length === save.tags.length) continue;
    await setSaveTags(save.id, next);
    changed++;
  }
  if (changed === 0) {
    pushToast("Selected items already have those tags.");
    return;
  }
  pushToast(`Pasted tags onto ${pluralize(changed, "item")}.`, {
    tone: "success",
  });
}

export async function clearTagsFromSelection(
  ids: readonly string[],
): Promise<void> {
  const saves = resolve(ids);
  let changed = 0;
  for (const save of saves) {
    if (save.tags.length === 0) continue;
    await setSaveTags(save.id, []);
    changed++;
  }
  if (changed === 0) return;
  pushToast(`Removed tags from ${pluralize(changed, "item")}.`);
}

// --- Clipboard --------------------------------------------------------------

export async function copyUrlsForSelection(
  ids: readonly string[],
): Promise<void> {
  const urls = resolve(ids)
    .map((s) => s.url)
    .filter((u): u is string => Boolean(u));
  if (urls.length === 0) {
    pushToast("No links in selection.", "error");
    return;
  }
  const ok = await writeClipboard(urls.join("\n"));
  if (ok) pushToast(`Copied ${pluralize(urls.length, "link")}.`);
}

export async function copyFilePathsForSelection(
  ids: readonly string[],
): Promise<void> {
  const saves = resolve(ids).filter((s) => s.files.length > 0);
  const paths: string[] = [];
  for (const save of saves) {
    const result = (await window.pond.query("saves.filePath", {
      id: save.id,
      fileIndex: save.coverIndex ?? 0,
    })) as { ok: true; path: string } | { ok: false; reason: string };
    if (result.ok) paths.push(result.path);
  }
  if (paths.length === 0) {
    pushToast("No files in selection.", "error");
    return;
  }
  const ok = await writeClipboard(paths.join("\n"));
  if (ok) pushToast(`Copied ${pluralize(paths.length, "file path")}.`);
}

// --- Export -----------------------------------------------------------------

export async function exportSelectionFiles(
  ids: readonly string[],
): Promise<void> {
  if (ids.length === 0) return;
  const result = (await window.pond.query("saves.exportFiles", {
    ids: [...ids],
  })) as
    | { ok: true; exported: number; dir: string }
    | { ok: false; error: string };
  if (!result.ok) {
    if (result.error !== "canceled") pushToast("Export failed.", "error");
    return;
  }
  pushToast(`Exported ${pluralize(result.exported, "file")}.`, {
    tone: "success",
  });
}

export async function exportSelectionCsv(
  ids: readonly string[],
): Promise<void> {
  if (ids.length === 0) return;
  const result = (await window.pond.query("saves.exportCsv", {
    ids: [...ids],
  })) as
    | { ok: true; count: number; path: string }
    | { ok: false; error: string };
  if (!result.ok) {
    if (result.error !== "canceled") pushToast("Export failed.", "error");
    return;
  }
  pushToast(`Exported ${pluralize(result.count, "row")} to CSV.`, {
    tone: "success",
  });
}
