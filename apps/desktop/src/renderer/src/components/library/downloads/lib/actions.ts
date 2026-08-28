import { openTrayConfirm } from "@/components/library/dock/confirm";
import { type DownloadRow, statusFeed } from "@/lib/status-feed";
import { downloadsSelection } from "@/stores/downloads-selection";

export async function retryDownloadRows(
  rows: readonly DownloadRow[],
): Promise<boolean> {
  const ids = rows.filter((r) => r.status === "failed").map((r) => r.saveId);
  if (ids.length === 0) return false;
  const result = (await window.pond.query("saves.retryFailed", {
    ids,
  })) as { ok: boolean; requeued: number };
  if (!result.ok || result.requeued === 0) {
    statusFeed.error("Retry failed items", "Couldn't retry failed items.");
    return false;
  }
  return true;
}

export async function cancelDownloadRows(
  rows: readonly DownloadRow[],
): Promise<void> {
  const live = rows.filter((r) => r.live && r.status !== "failed");
  if (live.length === 0) return;
  await Promise.all(
    live.map((row) => window.pond.pipelineCancelSave(row.saveId)),
  );
}

export function confirmCancelDownloadRows(rows: readonly DownloadRow[]): void {
  const live = rows.filter((r) => r.live && r.status !== "failed");
  if (live.length === 0) return;
  openTrayConfirm({
    title: "Cancel Selected",
    description:
      "Pond stops ingesting the selected saves. You can retry them later.",
    confirmLabel: "Cancel Selected",
    returnTo: null,
    onConfirm: () =>
      cancelDownloadRows(live).then(() => downloadsSelection.clear()),
  });
}
