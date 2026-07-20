import {
  purgeSaves,
  setSaveTags,
  trashSaves,
  untrashSaves,
} from "@/lib/save/mutate";
import type { Save } from "@/lib/types";
import { activity } from "@/stores/activity";
import { libraryViewContext } from "@/stores/library-view-context";
import { pool } from "@/stores/pool";
import { selection } from "@/stores/selection";
import { mergeUniqueTags } from "@/stores/tag-clipboard";

/** Inline feedback for the card that triggered the action. */
export interface SelectionActionResult {
  ok: boolean;
  message: string;
}

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

export function selectAllInView(): void {
  selection.set(libraryViewContext.filteredIds());
}

export function isAllSelected(): boolean {
  const all = libraryViewContext.filteredIds();
  return all.length > 0 && selection.size() >= all.length;
}

/** The subset "Retry failed" acts on. */
export function failedIdsIn(ids: readonly string[]): string[] {
  return resolve(ids)
    .filter((s) => s.status === "failed")
    .map((s) => s.id);
}

/** The main process resets each failed save's tasks and flips it back to ingesting, broadcasting the change to the pool; the requeued items reappear in the saving pill and queue. */
export async function retryFailedSelection(
  ids: readonly string[],
): Promise<void> {
  const failed = failedIdsIn(ids);
  if (failed.length === 0) return;
  const result = (await window.pond.query("saves.retryFailed", {
    ids: failed,
  })) as { ok: boolean; requeued: number };
  if (!result.ok || result.requeued === 0) {
    activity.error("Retry failed items", "Couldn't retry failed items.");
  }
}

/** Silent: the grid shows the change and Cmd+Z undoes it. */
export async function trashSelection(ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return;
  await trashSaves([...ids]);
  selection.clear();
}

export async function restoreSelection(ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return;
  await untrashSaves([...ids]);
  selection.clear();
}

export async function deleteSelectionForever(
  ids: readonly string[],
): Promise<void> {
  if (ids.length === 0) return;
  await purgeSaves([...ids]);
  selection.clear();
}

/** Batch apply from the tag card; the tag chips on the cards are the confirmation. */
export async function addTagsToSelection(
  ids: readonly string[],
  tags: readonly string[],
): Promise<void> {
  const clean = tags.map((t) => t.trim()).filter(Boolean);
  if (clean.length === 0) return;
  for (const save of resolve(ids)) {
    const next = mergeUniqueTags(save.tags, clean);
    if (next.length === save.tags.length) continue;
    await setSaveTags(save.id, next);
  }
}

export async function copyUrlsForSelection(
  ids: readonly string[],
): Promise<SelectionActionResult> {
  const urls = resolve(ids)
    .map((s) => s.url)
    .filter((u): u is string => Boolean(u));
  if (urls.length === 0) {
    return { ok: false, message: "No links in selection" };
  }
  const ok = await writeClipboard(urls.join("\n"));
  return ok
    ? { ok: true, message: `Copied ${pluralize(urls.length, "link")}` }
    : { ok: false, message: "Couldn't copy" };
}

export async function copyFilePathsForSelection(
  ids: readonly string[],
): Promise<SelectionActionResult> {
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
    return { ok: false, message: "No files in selection" };
  }
  const ok = await writeClipboard(paths.join("\n"));
  return ok
    ? { ok: true, message: `Copied ${pluralize(paths.length, "file path")}` }
    : { ok: false, message: "Couldn't copy" };
}

export async function exportSelectionFiles(
  ids: readonly string[],
): Promise<SelectionActionResult> {
  if (ids.length === 0) return { ok: false, message: "Nothing selected" };
  const job = activity.start("Exporting files");
  const result = (await window.pond.query("saves.exportFiles", {
    ids: [...ids],
  })) as
    | { ok: true; exported: number; dir: string }
    | { ok: false; error: string };
  if (!result.ok) {
    if (result.error === "canceled") {
      activity.dismiss(job);
      return { ok: true, message: "Export canceled" };
    }
    activity.fail(job, "Export failed.");
    return { ok: false, message: "Export failed" };
  }
  const message = `Exported ${pluralize(result.exported, "file")}`;
  activity.done(job, message);
  return { ok: true, message };
}

export async function exportSelectionCsv(
  ids: readonly string[],
): Promise<SelectionActionResult> {
  if (ids.length === 0) return { ok: false, message: "Nothing selected" };
  const job = activity.start("Exporting CSV");
  const result = (await window.pond.query("saves.exportCsv", {
    ids: [...ids],
  })) as
    | { ok: true; count: number; path: string }
    | { ok: false; error: string };
  if (!result.ok) {
    if (result.error === "canceled") {
      activity.dismiss(job);
      return { ok: true, message: "Export canceled" };
    }
    activity.fail(job, "Export failed.");
    return { ok: false, message: "Export failed" };
  }
  const message = `Exported ${pluralize(result.count, "row")} to CSV`;
  activity.done(job, message);
  return { ok: true, message };
}
