import { ContextMenu, useToast } from "@pond/ui";
import { usePlayer } from "@videojs/react";
import {
  Camera,
  Check,
  ClipboardCopy,
  Copy,
  Download,
  ExternalLink,
  FolderOpen,
  Gauge,
  Image as ImageIcon,
  Maximize2,
  PictureInPicture2,
  Play,
} from "lucide-react";
import { useCallback } from "react";
import { REVEAL_LABEL } from "@/components/save/preview/helpers";
import {
  enterPresentation,
  exportFile,
  openInNewWindow,
} from "@/lib/save-actions";
import type { Save } from "@/pool/types";
import { SPEED_OPTIONS } from "./speed-options";

const ICON_SIZE = 14;

type Availability = "available" | "unavailable" | "unsupported";
type PlayerStateSlice = {
  playbackRate: number;
  setPlaybackRate: (rate: number) => void;
  requestPictureInPicture: () => Promise<void>;
  pipAvailability: Availability;
};
const select =
  <K extends keyof PlayerStateSlice>(key: K) =>
  (s: unknown) =>
    (s as PlayerStateSlice)[key];

function Icon({
  component: Component,
}: {
  component: React.ComponentType<{ width: number; height: number }>;
}) {
  return <Component width={ICON_SIZE} height={ICON_SIZE} />;
}

function captureFrame(
  containerRef: React.RefObject<HTMLDivElement | null>,
): string | null {
  const container = containerRef.current;
  if (!container) return null;
  const video = container.querySelector("video");
  if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA)
    return null;
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}

interface VideoContextMenuProps {
  save: Save;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function VideoContextMenu({
  save,
  containerRef,
}: VideoContextMenuProps) {
  const toast = useToast();
  const hasFiles = save.files.length > 0;

  const playbackRate = usePlayer(select("playbackRate"));
  const setPlaybackRate = usePlayer(select("setPlaybackRate"));
  const requestPip = usePlayer(select("requestPictureInPicture"));
  const pipAvailable = usePlayer(select("pipAvailability")) === "available";

  const onCopyFrame = useCallback(async () => {
    const dataUrl = captureFrame(containerRef);
    if (!dataUrl) return;
    await window.pond.query("video.copyFrame", { dataUrl });
  }, [containerRef]);

  const onSaveFrame = useCallback(async () => {
    const dataUrl = captureFrame(containerRef);
    if (!dataUrl) return;
    await window.pond.query("video.saveFrame", { dataUrl });
  }, [containerRef]);

  const onSetThumbnail = useCallback(async () => {
    const dataUrl = captureFrame(containerRef);
    if (!dataUrl) return;
    await window.pond.query("video.setThumbnail", {
      saveId: save.id,
      dataUrl,
    });
  }, [containerRef, save.id]);

  const onReveal = useCallback(async () => {
    await window.pond.revealSave(save.id);
  }, [save.id]);

  const onOpenDefault = useCallback(async () => {
    await window.pond.openSaveFile(save.id);
  }, [save.id]);

  const onCopyFilePath = useCallback(async () => {
    await window.pond.query("video.copyFilePath", { saveId: save.id });
  }, [save.id]);

  const onPip = useCallback(() => {
    void requestPip().catch(() => {});
  }, [requestPip]);

  const onOpenWindow = useCallback(() => {
    void openInNewWindow(save);
  }, [save]);

  const onExport = useCallback(() => {
    void exportFile(save, toast);
  }, [save, toast]);

  const onPresentation = useCallback(() => {
    enterPresentation(save);
  }, [save]);

  const onSpeedChange = useCallback(
    (value: number) => {
      setPlaybackRate(value);
    },
    [setPlaybackRate],
  );

  return (
    <ContextMenu.Portal>
      <ContextMenu.Backdrop />
      <ContextMenu.Positioner>
        <ContextMenu.Popup>
          <ContextMenu.Item onClick={() => void onSetThumbnail()}>
            <ContextMenu.ItemIcon>
              <Icon component={ImageIcon} />
            </ContextMenu.ItemIcon>
            <ContextMenu.ItemLabel>
              Set as Video Thumbnail
            </ContextMenu.ItemLabel>
          </ContextMenu.Item>
          <ContextMenu.Item onClick={() => void onCopyFrame()}>
            <ContextMenu.ItemIcon>
              <Icon component={ClipboardCopy} />
            </ContextMenu.ItemIcon>
            <ContextMenu.ItemLabel>Copy Frame</ContextMenu.ItemLabel>
            <ContextMenu.ItemKbd>⌥C</ContextMenu.ItemKbd>
          </ContextMenu.Item>
          <ContextMenu.Item onClick={() => void onSaveFrame()}>
            <ContextMenu.ItemIcon>
              <Icon component={Camera} />
            </ContextMenu.ItemIcon>
            <ContextMenu.ItemLabel>Save Current Frame</ContextMenu.ItemLabel>
            <ContextMenu.ItemKbd>⌥S</ContextMenu.ItemKbd>
          </ContextMenu.Item>

          <ContextMenu.Separator />

          <ContextMenu.SubmenuRoot>
            <ContextMenu.SubmenuTrigger>
              <ContextMenu.ItemIcon>
                <Icon component={Gauge} />
              </ContextMenu.ItemIcon>
              <ContextMenu.ItemLabel>Playback Speed</ContextMenu.ItemLabel>
              <ContextMenu.ItemKbd>{playbackRate}×</ContextMenu.ItemKbd>
            </ContextMenu.SubmenuTrigger>
            <ContextMenu.Portal>
              <ContextMenu.Positioner>
                <ContextMenu.Popup>
                  <ContextMenu.RadioGroup
                    value={playbackRate}
                    onValueChange={onSpeedChange}
                  >
                    {SPEED_OPTIONS.map((rate) => (
                      <ContextMenu.RadioItem
                        key={rate}
                        value={rate}
                        closeOnClick
                      >
                        <ContextMenu.ItemIcon>
                          <ContextMenu.RadioItemIndicator>
                            <Icon component={Check} />
                          </ContextMenu.RadioItemIndicator>
                        </ContextMenu.ItemIcon>
                        <ContextMenu.ItemLabel>{rate}×</ContextMenu.ItemLabel>
                      </ContextMenu.RadioItem>
                    ))}
                  </ContextMenu.RadioGroup>
                </ContextMenu.Popup>
              </ContextMenu.Positioner>
            </ContextMenu.Portal>
          </ContextMenu.SubmenuRoot>

          <ContextMenu.Separator />

          <ContextMenu.Item
            disabled={!hasFiles}
            onClick={() => void onOpenDefault()}
          >
            <ContextMenu.ItemIcon>
              <Icon component={ExternalLink} />
            </ContextMenu.ItemIcon>
            <ContextMenu.ItemLabel>Open with Default App</ContextMenu.ItemLabel>
            <ContextMenu.ItemKbd>O</ContextMenu.ItemKbd>
          </ContextMenu.Item>
          <ContextMenu.Item onClick={onOpenWindow}>
            <ContextMenu.ItemIcon>
              <Icon component={Maximize2} />
            </ContextMenu.ItemIcon>
            <ContextMenu.ItemLabel>Open in New Window</ContextMenu.ItemLabel>
            <ContextMenu.ItemKbd>⌘O</ContextMenu.ItemKbd>
          </ContextMenu.Item>
          <ContextMenu.Item
            disabled={!hasFiles}
            onClick={() => void onReveal()}
          >
            <ContextMenu.ItemIcon>
              <Icon component={FolderOpen} />
            </ContextMenu.ItemIcon>
            <ContextMenu.ItemLabel>{REVEAL_LABEL}</ContextMenu.ItemLabel>
          </ContextMenu.Item>
          <ContextMenu.Item
            disabled={!hasFiles}
            onClick={() => void onCopyFilePath()}
          >
            <ContextMenu.ItemIcon>
              <Icon component={Copy} />
            </ContextMenu.ItemIcon>
            <ContextMenu.ItemLabel>Copy File Path</ContextMenu.ItemLabel>
          </ContextMenu.Item>

          <ContextMenu.Separator />

          <ContextMenu.Item disabled={!hasFiles} onClick={onExport}>
            <ContextMenu.ItemIcon>
              <Icon component={Download} />
            </ContextMenu.ItemIcon>
            <ContextMenu.ItemLabel>Export…</ContextMenu.ItemLabel>
            <ContextMenu.ItemKbd>⌘E</ContextMenu.ItemKbd>
          </ContextMenu.Item>
          <ContextMenu.Item disabled={!hasFiles} onClick={onPresentation}>
            <ContextMenu.ItemIcon>
              <Icon component={Play} />
            </ContextMenu.ItemIcon>
            <ContextMenu.ItemLabel>
              Enter Presentation Mode
            </ContextMenu.ItemLabel>
            <ContextMenu.ItemKbd>F5</ContextMenu.ItemKbd>
          </ContextMenu.Item>

          {pipAvailable ? (
            <>
              <ContextMenu.Separator />
              <ContextMenu.Item onClick={onPip}>
                <ContextMenu.ItemIcon>
                  <Icon component={PictureInPicture2} />
                </ContextMenu.ItemIcon>
                <ContextMenu.ItemLabel>
                  Picture-in-Picture
                </ContextMenu.ItemLabel>
              </ContextMenu.Item>
            </>
          ) : null}
        </ContextMenu.Popup>
      </ContextMenu.Positioner>
    </ContextMenu.Portal>
  );
}
