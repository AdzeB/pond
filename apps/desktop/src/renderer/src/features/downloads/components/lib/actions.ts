import { z } from "zod";
import {
  type DownloadRow,
  statusFeed,
} from "@/features/downloads/lib/status-feed";
import { downloadsSelection } from "@/features/downloads/state/downloads-selection";
import { trashSaves } from "@/features/saves/pool";
import { notify } from "@/shared/lib/toast";

const RetryResultSchema = z.object({ ok: z.boolean(), requeued: z.number() });
const SkipResultSchema = z.object({ ok: z.boolean(), skipped: z.number() });

export function canSkipDownload(row: DownloadRow): boolean {
  return row.live && row.status !== "complete" && row.status !== "skipped";
}

export function canTrashDownload(row: DownloadRow): boolean {
  return row.live && row.status !== "complete";
}

export function canCancelDownload(row: DownloadRow): boolean {
  return row.live && row.status !== "failed";
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

export function cancelDownloadRows(rows: readonly DownloadRow[]): void {
  const live = rows.filter(canCancelDownload);
  if (live.length === 0) return;
  void Promise.all(
    live.map((row) => window.pond.pipelineCancelSave(row.saveId)),
  ).then(() => downloadsSelection.clear());
}

export function skipDownloadRows(rows: readonly DownloadRow[]): void {
  const ids = [
    ...new Set(rows.filter(canSkipDownload).map((row) => row.saveId)),
  ];
  if (ids.length === 0) return;
  void window.pond
    .query("saves.skipIngest", { ids })
    .then((value) => {
      const result = SkipResultSchema.parse(value);
      if (!result.ok || result.skipped === 0) throw new Error("skip failed");
      downloadsSelection.clear();
    })
    .catch(() =>
      statusFeed.error(
        "Skip downloads",
        "Couldn't skip these downloads. Try again.",
      ),
    );
}

interface TrashDownloadDependencies {
  trash: typeof trashSaves;
  notify: typeof notify;
  undo: () => Promise<{ ok: boolean }>;
}

const TRASH_DOWNLOAD_DEPENDENCIES: TrashDownloadDependencies = {
  trash: trashSaves,
  notify,
  undo: () => window.pond.undo(),
};

export function trashDownloadRows(
  rows: readonly DownloadRow[],
  dependencies = TRASH_DOWNLOAD_DEPENDENCIES,
): void {
  const trashable = rows.filter(canTrashDownload);
  if (trashable.length === 0) return;
  const ids = [...new Set(trashable.map((row) => row.saveId))];
  void dependencies
    .trash(ids)
    .then(() => {
      downloadsSelection.clear();
      dependencies.notify({
        id: "trash-downloads",
        title:
          trashable.length === 1
            ? "Moved download to Trash"
            : `Moved ${trashable.length} downloads to Trash`,
        action: {
          label: "Undo",
          onClick: () => {
            void dependencies.undo().then((result) => {
              if (!result.ok)
                statusFeed.error(
                  "Undo move to Trash",
                  "Couldn't restore these downloads. Try again.",
                );
            });
          },
        },
      });
    })
    .catch(() =>
      statusFeed.error(
        "Move to Trash",
        "Couldn't move these downloads to Trash. Try again.",
      ),
    );
}
