import { Dialog } from "@pond/ui";
import { z } from "zod";
import {
  type DownloadRow,
  statusFeed,
} from "@/features/downloads/lib/status-feed";
import { downloadsSelection } from "@/features/downloads/state/downloads-selection";
import { trashSaves } from "@/features/saves/lib/mutate";

const RetryResultSchema = z.object({ ok: z.boolean(), requeued: z.number() });
const SkipResultSchema = z.object({ ok: z.boolean(), skipped: z.number() });

export function canSkipDownload(row: DownloadRow): boolean {
  return row.live && row.status !== "complete" && row.status !== "skipped";
}

export function canTrashDownload(row: DownloadRow): boolean {
  return row.live && row.status !== "complete";
}

export async function retryDownloadRows(
  rows: readonly DownloadRow[],
): Promise<boolean> {
  const ids = rows.filter((r) => r.status === "failed").map((r) => r.saveId);
  if (ids.length === 0) return false;
  const result = RetryResultSchema.parse(
    await window.pond.query("saves.retryFailed", { ids }),
  );
  if (!result.ok || result.requeued === 0) {
    statusFeed.error("Retry failed items", "Couldn't retry failed items.");
    return false;
  }
  return true;
}

async function cancelDownloadRows(rows: readonly DownloadRow[]): Promise<void> {
  const live = rows.filter((r) => r.live && r.status !== "failed");
  if (live.length === 0) return;
  await Promise.all(
    live.map((row) => window.pond.pipelineCancelSave(row.saveId)),
  );
}

export function confirmCancelDownloadRows(rows: readonly DownloadRow[]): void {
  const live = rows.filter((r) => r.live && r.status !== "failed");
  if (live.length === 0) return;
  Dialog.confirm({
    title: "Cancel Selected",
    description:
      "Pond stops ingesting the selected saves. You can retry them later.",
    confirmLabel: "Cancel Selected",
    confirmVariant: "destructive",
    onConfirm: () =>
      cancelDownloadRows(live).then(() => downloadsSelection.clear()),
  });
}

async function skipDownloadRows(rows: readonly DownloadRow[]): Promise<void> {
  const ids = [
    ...new Set(rows.filter(canSkipDownload).map((row) => row.saveId)),
  ];
  if (ids.length === 0) return;
  const result = SkipResultSchema.parse(
    await window.pond.query("saves.skipIngest", { ids }),
  );
  if (!result.ok || result.skipped === 0) {
    throw new Error("skip failed");
  }
}

export function confirmSkipDownloadRows(rows: readonly DownloadRow[]): void {
  const skippable = rows.filter(canSkipDownload);
  if (skippable.length === 0) return;
  Dialog.confirm({
    title: skippable.length === 1 ? "Skip Download" : "Skip Selected",
    description:
      "Pond stops ingesting these saves and will not harvest them again.",
    confirmLabel: skippable.length === 1 ? "Skip Download" : "Skip Selected",
    confirmVariant: "destructive",
    onConfirm: () =>
      skipDownloadRows(skippable)
        .then(() => downloadsSelection.clear())
        .catch(() =>
          statusFeed.error(
            "Skip downloads",
            "Couldn't skip these downloads. Try again.",
          ),
        ),
  });
}

async function trashDownloadRows(rows: readonly DownloadRow[]): Promise<void> {
  const ids = [
    ...new Set(rows.filter(canTrashDownload).map((row) => row.saveId)),
  ];
  if (ids.length === 0) return;
  await trashSaves(ids);
}

export function confirmTrashDownloadRows(rows: readonly DownloadRow[]): void {
  const trashable = rows.filter(canTrashDownload);
  if (trashable.length === 0) return;
  Dialog.confirm({
    title: trashable.length === 1 ? "Move to Trash" : "Move Selected to Trash",
    description:
      "These saves leave Downloads and go to Trash. Harvest will not try them again.",
    confirmLabel: "Move to Trash",
    confirmVariant: "destructive",
    onConfirm: () =>
      trashDownloadRows(trashable)
        .then(() => downloadsSelection.clear())
        .catch(() =>
          statusFeed.error(
            "Move to Trash",
            "Couldn't move these downloads to Trash. Try again.",
          ),
        ),
  });
}
