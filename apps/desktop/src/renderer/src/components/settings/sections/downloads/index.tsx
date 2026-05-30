import { Select, Switch, useToast } from "@pond/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import { Settings } from "@/components/settings";
import {
  DEFAULT_IMAGE_DOWNLOAD,
  DEFAULT_VIDEO_DOWNLOAD,
  type ImageDownloadPrefs,
  type SettingsRow,
  type VideoDownloadPrefs,
} from "../_types";

export function DownloadsSection() {
  const toast = useToast();
  const qc = useQueryClient();
  const [videoBusy, setVideoBusy] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);

  const { data: settings } = useQuery<SettingsRow>({
    queryKey: ["settings", "get"],
    queryFn: async () => {
      const row = (await window.pond.query("settings.get", {})) as SettingsRow;
      return {
        ...row,
        videoDownload: row.videoDownload ?? DEFAULT_VIDEO_DOWNLOAD,
        imageDownload: row.imageDownload ?? DEFAULT_IMAGE_DOWNLOAD,
      };
    },
  });

  async function patchVideoDownload(patch: Partial<VideoDownloadPrefs>) {
    if (!settings) return;
    const next = { ...settings.videoDownload, ...patch };
    qc.setQueryData<SettingsRow>(["settings", "get"], {
      ...settings,
      videoDownload: next,
    });
    setVideoBusy(true);
    try {
      const r = (await window.pond.query(
        "settings.setVideoDownload",
        patch,
      )) as { ok: true; videoDownload: VideoDownloadPrefs };
      qc.setQueryData<SettingsRow | undefined>(["settings", "get"], (cur) =>
        cur ? { ...cur, videoDownload: r.videoDownload } : cur,
      );
    } catch (err) {
      toast.add({
        title: "Couldn't save preferences",
        description:
          err instanceof Error
            ? err.message
            : "Try again. If it keeps happening, check Developer › Open Log Directory.",
        type: "error",
      });
    } finally {
      setVideoBusy(false);
    }
  }

  async function patchImageDownload(patch: Partial<ImageDownloadPrefs>) {
    if (!settings) return;
    const next = { ...settings.imageDownload, ...patch };
    qc.setQueryData<SettingsRow>(["settings", "get"], {
      ...settings,
      imageDownload: next,
    });
    setImageBusy(true);
    try {
      const r = (await window.pond.query(
        "settings.setImageDownload",
        patch,
      )) as { ok: true; imageDownload: ImageDownloadPrefs };
      qc.setQueryData<SettingsRow | undefined>(["settings", "get"], (cur) =>
        cur ? { ...cur, imageDownload: r.imageDownload } : cur,
      );
    } catch (err) {
      toast.add({
        title: "Couldn't save preferences",
        description:
          err instanceof Error
            ? err.message
            : "Try again. If it keeps happening, check Developer › Open Log Directory.",
        type: "error",
      });
    } finally {
      setImageBusy(false);
    }
  }

  const videoPrefs = settings?.videoDownload ?? DEFAULT_VIDEO_DOWNLOAD;
  const heightValue =
    videoPrefs.maxHeight === null ? "any" : String(videoPrefs.maxHeight);
  const videoSizeValue =
    videoPrefs.maxFileSizeMb === null
      ? "any"
      : String(videoPrefs.maxFileSizeMb);

  const imagePrefs = settings?.imageDownload ?? DEFAULT_IMAGE_DOWNLOAD;
  const imageEdgeValue =
    imagePrefs.maxLongEdge === null ? "any" : String(imagePrefs.maxLongEdge);
  const imageSizeValue =
    imagePrefs.maxFileSizeMb === null
      ? "any"
      : String(imagePrefs.maxFileSizeMb);

  return (
    <Settings.Page>
      <Settings.Header>
        <Settings.Title>Downloads</Settings.Title>
        <Settings.Description>
          How Pond treats videos and images it saves.
        </Settings.Description>
      </Settings.Header>

      <Settings.Section>
        <Settings.SectionTitle>Videos</Settings.SectionTitle>
        <Settings.List>
          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Download Videos</Settings.ItemTitle>
              <Settings.ItemDescription>
                Fetch the MP4 alongside the poster for offline playback.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Switch.Root
                checked={videoPrefs.enabled}
                disabled={videoBusy || !settings}
                onCheckedChange={(checked: boolean) =>
                  void patchVideoDownload({ enabled: checked })
                }
              />
            </Settings.ItemControl>
          </Settings.Item>

          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Maximum Resolution</Settings.ItemTitle>
              <Settings.ItemDescription>
                Higher resolutions mean bigger files. 1080p suits most clips.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Select.Root
                value={heightValue}
                disabled={videoBusy || !videoPrefs.enabled || !settings}
                onValueChange={(v) => {
                  if (v === null || v === "any") {
                    void patchVideoDownload({ maxHeight: null });
                    return;
                  }
                  void patchVideoDownload({
                    maxHeight: Number.parseInt(v, 10),
                  });
                }}
              >
                <Select.Trigger>
                  <Select.Value />
                  <Select.Icon>
                    <ChevronsUpDown />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Positioner sideOffset={6}>
                    <Select.Popup>
                      <Select.Item value="480">480p (Small Files)</Select.Item>
                      <Select.Item value="720">720p</Select.Item>
                      <Select.Item value="1080">
                        1080p (Recommended)
                      </Select.Item>
                      <Select.Item value="1440">1440p</Select.Item>
                      <Select.Item value="2160">2160p / 4K</Select.Item>
                      <Select.Item value="any">Original (No Cap)</Select.Item>
                    </Select.Popup>
                  </Select.Positioner>
                </Select.Portal>
              </Select.Root>
            </Settings.ItemControl>
          </Settings.Item>

          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Maximum File Size</Settings.ItemTitle>
              <Settings.ItemDescription>
                Cap each download so a long stream can't fill the disk.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Select.Root
                value={videoSizeValue}
                disabled={videoBusy || !videoPrefs.enabled || !settings}
                onValueChange={(v) => {
                  if (v === null || v === "any") {
                    void patchVideoDownload({ maxFileSizeMb: null });
                    return;
                  }
                  void patchVideoDownload({
                    maxFileSizeMb: Number.parseInt(v, 10),
                  });
                }}
              >
                <Select.Trigger>
                  <Select.Value />
                  <Select.Icon>
                    <ChevronsUpDown />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Positioner sideOffset={6}>
                    <Select.Popup>
                      <Select.Item value="200">{"200\u00A0MB"}</Select.Item>
                      <Select.Item value="500">
                        {"500\u00A0MB (Recommended)"}
                      </Select.Item>
                      <Select.Item value="1000">{"1\u00A0GB"}</Select.Item>
                      <Select.Item value="2000">{"2\u00A0GB"}</Select.Item>
                      <Select.Item value="5000">{"5\u00A0GB"}</Select.Item>
                      <Select.Item value="any">No Cap</Select.Item>
                    </Select.Popup>
                  </Select.Positioner>
                </Select.Portal>
              </Select.Root>
            </Settings.ItemControl>
          </Settings.Item>
        </Settings.List>
      </Settings.Section>

      <Settings.Section>
        <Settings.SectionTitle>Images</Settings.SectionTitle>
        <Settings.List>
          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Maximum Resolution</Settings.ItemTitle>
              <Settings.ItemDescription>
                Long edge in pixels. Pond resizes anything larger.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Select.Root
                value={imageEdgeValue}
                disabled={imageBusy || !settings}
                onValueChange={(v) => {
                  if (v === null || v === "any") {
                    void patchImageDownload({ maxLongEdge: null });
                    return;
                  }
                  void patchImageDownload({
                    maxLongEdge: Number.parseInt(v, 10),
                  });
                }}
              >
                <Select.Trigger>
                  <Select.Value />
                  <Select.Icon>
                    <ChevronsUpDown />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Positioner sideOffset={6}>
                    <Select.Popup>
                      <Select.Item value="1024">1024 px</Select.Item>
                      <Select.Item value="2048">
                        2048 px (Recommended)
                      </Select.Item>
                      <Select.Item value="4096">4096 px / 4K</Select.Item>
                      <Select.Item value="any">Original (No Cap)</Select.Item>
                    </Select.Popup>
                  </Select.Positioner>
                </Select.Portal>
              </Select.Root>
            </Settings.ItemControl>
          </Settings.Item>

          <Settings.Item>
            <Settings.ItemDetails>
              <Settings.ItemTitle>Maximum File Size</Settings.ItemTitle>
              <Settings.ItemDescription>
                Skip downloads bigger than the cap.
              </Settings.ItemDescription>
            </Settings.ItemDetails>
            <Settings.ItemControl>
              <Select.Root
                value={imageSizeValue}
                disabled={imageBusy || !settings}
                onValueChange={(v) => {
                  if (v === null || v === "any") {
                    void patchImageDownload({ maxFileSizeMb: null });
                    return;
                  }
                  void patchImageDownload({
                    maxFileSizeMb: Number.parseInt(v, 10),
                  });
                }}
              >
                <Select.Trigger>
                  <Select.Value />
                  <Select.Icon>
                    <ChevronsUpDown />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Positioner sideOffset={6}>
                    <Select.Popup>
                      <Select.Item value="5">{"5\u00A0MB"}</Select.Item>
                      <Select.Item value="10">
                        {"10\u00A0MB (Recommended)"}
                      </Select.Item>
                      <Select.Item value="25">{"25\u00A0MB"}</Select.Item>
                      <Select.Item value="50">{"50\u00A0MB"}</Select.Item>
                      <Select.Item value="any">No Cap</Select.Item>
                    </Select.Popup>
                  </Select.Positioner>
                </Select.Portal>
              </Select.Root>
            </Settings.ItemControl>
          </Settings.Item>
        </Settings.List>
      </Settings.Section>
    </Settings.Page>
  );
}
