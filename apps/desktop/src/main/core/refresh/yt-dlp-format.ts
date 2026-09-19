import type { Source, VideoDownloadSettings } from "@pond/schema/db";

const YTDLP_CONCURRENT_FRAGMENTS = 8;
export const YTDLP_TRANSFER_FLAGS = [
  "--concurrent-fragments",
  String(YTDLP_CONCURRENT_FRAGMENTS),
] as const;

/** yt-dlp format filters; `~=` regex-matches the codec name variants a platform reports. */
function videoCodecFilter(codec: VideoDownloadSettings["videoCodec"]): string {
  switch (codec) {
    case "h264":
      return "[vcodec~='^(avc1|h264)']";
    case "hevc":
      return "[vcodec~='^(hev1|hvc1|h265)']";
    case "av1":
      return "[vcodec~='^(av01|av1)']";
    case "vp9":
      return "[vcodec~='^(vp09|vp9)']";
    default:
      return "";
  }
}

function audioCodecFilter(codec: VideoDownloadSettings["audioCodec"]): string {
  switch (codec) {
    case "aac":
      return "[acodec~='^(mp4a|aac)']";
    case "opus":
      return "[acodec^=opus]";
    default:
      return "";
  }
}

export function formatSelector(
  source: Source | null,
  prefs: VideoDownloadSettings,
): string {
  const h = prefs.maxHeight ? `[height<=${prefs.maxHeight}]` : "";
  const f = prefs.maxFps ? `[fps<=${prefs.maxFps}]` : "";
  const limits = `${h}${f}`;
  const vf = videoCodecFilter(prefs.videoCodec);
  const af = audioCodecFilter(prefs.audioCodec);

  const chain: string[] = [];
  if (source === "tiktok") {
    chain.push(`bv*${vf}[format_note*=play]${limits}+ba${af}`);
  }
  chain.push(
    `bv*${vf}${limits}+ba${af}`,
    `bv*${limits}+ba`,
    `b${vf}${limits}`,
    `b${limits}`,
    "b",
  );
  return chain.join("/");
}

export function maxFilesizeArg(prefs: VideoDownloadSettings): string | null {
  const mb = prefs.maxFileSizeMb;
  if (mb === null || mb === undefined || mb <= 0) return null;
  return `${mb}M`;
}
