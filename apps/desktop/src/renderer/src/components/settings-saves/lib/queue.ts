import type { Op } from "@pond/schema/db";
import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import { useMemo } from "react";
import { useSaves } from "@/hooks/use-saves";
import type { Save } from "@/lib/types";
import { savesStore } from "@/stores/pool";

/** Completed saves only appear if they landed after app start; cleared ids stay hidden across visits but reset with the window. */
const SESSION_START = Date.now();
const clearedIds = new Set<string>();

/** The cleared set lives outside React; bumping this store re-renders every subscriber. */
const clearRevision = new Store(0);

export type RowStatus = "saving" | "saved" | "failed";

export interface QueueRow {
  save: Save;
  name: string;
  size: number | null;
  status: RowStatus;
  progress: number;
  stage: string | null;
  error: string | null;
}

const STAGE_LABELS: Record<Op, string> = {
  harvest_metadata: "Reading page",
  capture_tweet: "Capturing tweet",
  fetch_blobs: "Downloading media",
  archive_page: "Archiving site",
  fetch_video_ytdlp: "Downloading video",
  ensure_poster: "Making poster",
  fetch_avatar: "Fetching avatar",
  finalize: "Finalizing",
};

function toRow(save: Save): QueueRow | null {
  let status: RowStatus;
  if (save.status === "ingesting") status = "saving";
  else if (save.status === "failed") status = "failed";
  else if (
    (save.ingestCompletedAt ?? 0) >= SESSION_START &&
    !clearedIds.has(save.id)
  )
    status = "saved";
  else return null;

  const tasks = save.tasks ?? [];
  let done = 0;
  let stage: string | null = null;
  let error: string | null = null;
  for (const t of tasks) {
    if (t.status === "done") done += 1;
    else if (t.status === "running") stage = STAGE_LABELS[t.op];
    else if (t.status === "failed" && !error) {
      error = t.lastError;
      stage ??= STAGE_LABELS[t.op];
    }
  }
  /** Nothing running yet: show the first unfinished op. */
  if (status === "saving" && !stage) {
    const next = tasks.find((t) => t.status !== "done");
    stage = next ? STAGE_LABELS[next.op] : null;
  }

  const size =
    save.fileSize ??
    (save.files.length > 0
      ? save.files.reduce((sum, f) => sum + (f.size || 0), 0)
      : null);

  return {
    save,
    name: save.title?.trim() || save.url,
    size,
    status,
    progress:
      status === "saved" ? 1 : tasks.length > 0 ? done / tasks.length : 0,
    stage,
    error,
  };
}

/** Task errors carry a class-name prefix ("TransientError: fetch_blobs: no media"); the row shows only the human tail. */
export function humanizeError(error: string | null): string {
  if (!error) return "Something went wrong";
  const tail = error
    .replace(/^[A-Za-z]*Error:\s*/, "")
    .replace(/^[a-z0-9_]+:\s*/, "")
    .trim();
  if (!tail) return "Something went wrong";
  return tail.charAt(0).toUpperCase() + tail.slice(1);
}

/** Reads the pool directly so the Clear action never subscribes to per-save progress updates. */
export function clearAllFinished(): void {
  for (const save of savesStore.state.sorted) {
    if (save.deletedAt != null) continue;
    if (save.status === "ingesting" || save.status === "failed") continue;
    if ((save.ingestCompletedAt ?? 0) >= SESSION_START) clearedIds.add(save.id);
  }
  clearRevision.setState((n) => n + 1);
}

export function useSaveQueue() {
  const saves = useSaves();
  const revision = useSelector(clearRevision, (n) => n);

  return useMemo(() => {
    void revision;
    const rows: QueueRow[] = [];
    for (const save of saves) {
      if (save.deletedAt != null) continue;
      const row = toRow(save);
      if (row) rows.push(row);
    }

    const saving = rows
      .filter((r) => r.status === "saving")
      .sort((a, b) => b.progress - a.progress);
    /** ULIDs order by creation time, so id descending is newest first. */
    const failed = rows
      .filter((r) => r.status === "failed")
      .sort((a, b) => (a.save.id < b.save.id ? 1 : -1));
    const saved = rows
      .filter((r) => r.status === "saved")
      .sort(
        (a, b) =>
          (b.save.ingestCompletedAt ?? 0) - (a.save.ingestCompletedAt ?? 0),
      );

    return { saving, failed, saved };
  }, [saves, revision]);
}
