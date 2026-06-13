import type { Save } from "@/lib/types";

// "Downloading" while fetch_video_ytdlp is pending/running AND there's video evidence — the gate stops text/image saves flashing "Queued".
export function useIsVideoDownloading(save: Save | null | undefined): boolean {
  if (!save) return false;
  if (save.status === "complete" || save.status === "failed") return false;
  if (!hasVideoEvidence(save)) return false;
  const tasks = save.tasks ?? [];
  if (tasks.length === 0) return save.status === "ingesting";
  const t = tasks.find((x) => x.op === "fetch_video_ytdlp");
  if (!t) return false;
  return t.status === "pending" || t.status === "running";
}

function hasVideoEvidence(save: Save): boolean {
  if (save.mediaType === "video" || save.mediaType === "mixed") return true;
  if ((save.files ?? []).some((f) => f.kind === "video")) return true;
  const captureMedia = (
    save.rawJson as
      | {
          capture?: { media?: Array<{ type?: string }> };
        }
      | null
      | undefined
  )?.capture?.media;
  if (Array.isArray(captureMedia)) {
    return captureMedia.some((m) => m?.type === "video");
  }
  return false;
}
