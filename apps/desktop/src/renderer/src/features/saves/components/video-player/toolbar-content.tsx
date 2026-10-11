import {
  IconClone2Outline18,
  IconFlipHorizontal2Outline18,
  IconFloppyDiskOutline18,
  IconImagePlusOutline18,
  IconRotateImageClockwiseOutline18,
} from "@pond/icons/outline/18";
import { useVideo } from "@pond/ui";
import type { ReactNode } from "react";
import { ViewerHud } from "@/features/saves/components/viewers/hud";
import { OriginalFileActions } from "@/features/saves/components/viewers/original-file-actions";
import {
  copyVideoFrame,
  saveVideoFrame,
  setVideoThumbnail,
} from "@/features/saves/lib/media/capture-frame";
import type { Save } from "@/features/saves/types";
import { ShortcutKeys } from "@/shared/components/shortcut-keys";

export interface VideoToolbarSlots {
  actions: ReactNode;
  edits: ReactNode;
}

export function VideoToolbarContent({
  save,
  fileIndex,
  mirrored,
  onMirror,
  onRotate,
  render,
}: {
  save: Save | undefined;
  fileIndex: number;
  mirrored: boolean;
  onMirror: () => void;
  onRotate: () => void;
  render?: (slots: VideoToolbarSlots) => ReactNode;
}) {
  const { meta, state } = useVideo();
  const file = save?.files[fileIndex];
  const videoReady = state.duration > 0 && Boolean(meta.videoRef.current);
  const withVideo = (action: (video: HTMLVideoElement) => void) => {
    const video = meta.videoRef.current;
    if (video) action(video);
  };

  if (!render) return null;

  return render({
    actions: (
      <>
        <ViewerHud.Tool
          label="Copy Current Frame"
          shortcut={<ShortcutKeys id="viewer.copy-frame" />}
          disabled={!videoReady}
          onClick={() => withVideo((video) => void copyVideoFrame(video))}
        >
          <IconClone2Outline18 />
        </ViewerHud.Tool>
        <ViewerHud.Tool
          label="Save Current Frame"
          shortcut={<ShortcutKeys id="viewer.save-frame" />}
          disabled={!videoReady}
          onClick={() => withVideo((video) => void saveVideoFrame(video))}
        >
          <IconFloppyDiskOutline18 />
        </ViewerHud.Tool>
        {save ? (
          <ViewerHud.Tool
            label="Set Current Frame as Thumbnail"
            disabled={!videoReady}
            onClick={() =>
              withVideo((video) => void setVideoThumbnail(save.id, video))
            }
          >
            <IconImagePlusOutline18 />
          </ViewerHud.Tool>
        ) : null}
        {save && file ? (
          <OriginalFileActions save={save} fileIndex={fileIndex} />
        ) : null}
      </>
    ),
    edits: (
      <>
        <ViewerHud.Tool label="Rotate Video" onClick={onRotate}>
          <IconRotateImageClockwiseOutline18 />
        </ViewerHud.Tool>
        <ViewerHud.Tool
          label="Mirror Video"
          pressed={mirrored}
          onClick={onMirror}
        >
          <IconFlipHorizontal2Outline18 />
        </ViewerHud.Tool>
      </>
    ),
  });
}
