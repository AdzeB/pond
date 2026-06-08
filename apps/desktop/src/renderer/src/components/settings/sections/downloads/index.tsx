import { useToast } from "@pond/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Binding } from "@/components/settings/engine";
import {
  DEFAULT_IMAGE_DOWNLOAD,
  DEFAULT_VIDEO_DOWNLOAD,
  type ImageDownloadPrefs,
  type SettingsRow,
  type VideoDownloadPrefs,
} from "../_types";

export function useVideoDownloadBinding(): Binding {
  return useDownloadBinding("videoDownload", "settings.setVideoDownload");
}

export function useImageDownloadBinding(): Binding {
  return useDownloadBinding("imageDownload", "settings.setImageDownload");
}

type DownloadField = "videoDownload" | "imageDownload";
type DownloadChannel =
  | "settings.setVideoDownload"
  | "settings.setImageDownload";

const FALLBACK: Record<DownloadField, VideoDownloadPrefs | ImageDownloadPrefs> =
  {
    videoDownload: DEFAULT_VIDEO_DOWNLOAD,
    imageDownload: DEFAULT_IMAGE_DOWNLOAD,
  };

function useDownloadBinding(
  field: DownloadField,
  channel: DownloadChannel,
): Binding {
  const toast = useToast();
  const qc = useQueryClient();

  const { data } = useQuery<SettingsRow>({
    queryKey: ["settings", "get"],
    queryFn: async () => {
      const row = (await window.pond.query("settings.get", {})) as SettingsRow;
      // Merge per-field so any missing key falls back to its original
      // default; a whole-object fallback would leave individual controls
      // blank when only some fields are stored.
      return {
        ...row,
        videoDownload: { ...DEFAULT_VIDEO_DOWNLOAD, ...row.videoDownload },
        imageDownload: { ...DEFAULT_IMAGE_DOWNLOAD, ...row.imageDownload },
      };
    },
  });

  const values = (data?.[field] ?? FALLBACK[field]) as unknown as Record<
    string,
    unknown
  >;

  const patch = (delta: Partial<Record<string, unknown>>) => {
    if (!data) return;
    const previous = data[field];
    qc.setQueryData<SettingsRow>(["settings", "get"], {
      ...data,
      [field]: { ...previous, ...delta },
    });
    void window.pond
      .query(channel, delta)
      .then((r) => {
        const next = (r as Record<string, unknown>)[field];
        qc.setQueryData<SettingsRow | undefined>(["settings", "get"], (cur) =>
          cur ? { ...cur, [field]: next } : cur,
        );
      })
      .catch((err) => {
        qc.setQueryData<SettingsRow | undefined>(["settings", "get"], (cur) =>
          cur ? { ...cur, [field]: previous } : cur,
        );
        toast.add({
          title: "Couldn't save preferences",
          description:
            err instanceof Error
              ? err.message
              : "Try again. If it keeps happening, check Developer › Open Log Directory.",
          type: "error",
        });
      });
  };

  return { values, patch, loaded: Boolean(data) };
}
