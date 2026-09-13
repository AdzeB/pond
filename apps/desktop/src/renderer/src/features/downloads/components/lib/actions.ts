import { Dialog } from "@pond/ui";
import { z } from "zod";
import {
  type DownloadRow,
  statusFeed,
} from "@/features/downloads/lib/status-feed";
import { downloadsSelection } from "@/features/downloads/state/downloads-selection";

const RetryResultSchema = z.object({ ok: z.boolean(), requeued: z.number() });

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
