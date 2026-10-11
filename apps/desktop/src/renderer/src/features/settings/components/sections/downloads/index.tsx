import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import type { Binding } from "@/features/settings/components/engine";
import {
  DEFAULT_IMAGE_DOWNLOAD,
  DEFAULT_VIDEO_DOWNLOAD,
  type ImageDownloadPrefs,
  type SettingsRow,
  type VideoDownloadPrefs,
} from "@/features/settings/lib/section-types";
import { notify } from "@/shared/lib/toast";

const VideoDownloadSchema = z.object({
  enabled: z.boolean(),
  maxHeight: z.number().nullable(),
  maxFps: z.number().nullable(),
  videoCodec: z.enum(["h264", "hevc", "av1", "vp9", "any"]),
  audioCodec: z.enum(["aac", "opus", "any"]),
  container: z.enum(["auto", "mp4", "mkv", "webm", "mov"]),
  maxFileSizeMb: z.number().nullable(),
  subtitles: z.enum(["off", "download", "embed"]),
  subtitleLang: z.string(),
  embedMetadata: z.boolean(),
  embedThumbnail: z.boolean(),
  embedChapters: z.boolean(),
  sponsorblockRemove: z.boolean(),
}) satisfies z.ZodType<VideoDownloadPrefs>;

const ImageDownloadSchema = z.object({
  maxLongEdge: z.number().nullable(),
  format: z.enum(["original", "jpeg", "png", "webp", "avif"]),
  quality: z.number(),
  lossless: z.boolean(),
  progressive: z.boolean(),
  preserveMetadata: z.boolean(),
  maxFileSizeMb: z.number().nullable(),
}) satisfies z.ZodType<ImageDownloadPrefs>;

const SettingsRowSchema = z.object({
  id: z.string().catch(""),
  libraryRoot: z.string().nullable().catch(null),
  videoDownload: VideoDownloadSchema.partial().catch({}),
  imageDownload: ImageDownloadSchema.partial().catch({}),
});

const SavedSectionSchema = z.object({
  videoDownload: VideoDownloadSchema.partial().optional().catch(undefined),
  imageDownload: ImageDownloadSchema.partial().optional().catch(undefined),
});

export function useVideoDownloadBinding(): Binding<VideoDownloadPrefs> {
  return useDownloadBinding(
    "videoDownload",
    "settings.setVideoDownload",
    DEFAULT_VIDEO_DOWNLOAD,
  );
}

export function useImageDownloadBinding(): Binding<ImageDownloadPrefs> {
  return useDownloadBinding(
    "imageDownload",
    "settings.setImageDownload",
    DEFAULT_IMAGE_DOWNLOAD,
  );
}

type DownloadField = "videoDownload" | "imageDownload";
type DownloadChannel =
  | "settings.setVideoDownload"
  | "settings.setImageDownload";

let downloadSaveQueue = Promise.resolve();

function useDownloadBinding<K extends DownloadField>(
  field: K,
  channel: DownloadChannel,
  fallback: SettingsRow[K],
): Binding<SettingsRow[K]> {
  const qc = useQueryClient();

  const { data } = useQuery<SettingsRow>({
    queryKey: ["settings", "get"],
    queryFn: async () => {
      const row = SettingsRowSchema.parse(
        await window.pond.query("settings.get", {}),
      );
      return {
        ...row,
        videoDownload: { ...DEFAULT_VIDEO_DOWNLOAD, ...row.videoDownload },
        imageDownload: { ...DEFAULT_IMAGE_DOWNLOAD, ...row.imageDownload },
      };
    },
  });

  const values = data?.[field] ?? fallback;

  const patch = (delta: Partial<SettingsRow[K]>) => {
    if (!data) return;
    const params: Partial<VideoDownloadPrefs> | Partial<ImageDownloadPrefs> =
      delta;
    const operation = downloadSaveQueue.then(async () => {
      const saved = await window.pond.query(channel, params);
      const next = SavedSectionSchema.parse(saved)[field];
      if (!next) throw new Error("Missing saved download settings");
      qc.setQueryData<SettingsRow | undefined>(
        ["settings", "get"],
        (current) =>
          current
            ? { ...current, [field]: { ...current[field], ...next } }
            : current,
      );
    });
    downloadSaveQueue = operation.catch(() => {
      notify({
        id: "download-prefs-error",
        title: "Couldn't save download settings",
        description: "Your previous setting is unchanged. Try again.",
        timeout: 8000,
      });
    });
  };

  return { values, patch, loaded: Boolean(data) };
}
