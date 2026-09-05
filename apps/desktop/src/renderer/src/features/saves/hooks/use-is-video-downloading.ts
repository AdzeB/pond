import type { Save } from "@/features/saves/types";

export function useIsVideoDownloading(save: Save | null | undefined): boolean {
  if (!save) return false;
  if (save.status === "complete" || save.status === "failed") return false;
  if (!hasVideoEvidence(save)) return false;
  const t = (save.tasks ?? []).find((x) => x.op === "fetch_video_ytdlp");
  return t?.status === "running";
}

function hasVideoEvidence(save: Save): boolean {
  if (save.mediaType === "video") return true;
  if ((save.files ?? []).some((f) => f.kind === "video")) return true;
  const captureMedia = save.rawJson?.capture?.media;
  if (Array.isArray(captureMedia)) {
    return captureMedia.some((m) => m?.type === "video");
  }
  return false;
}
