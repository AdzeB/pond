import {
  IconAnimationFrames,
  IconCrop,
  IconExpand,
  IconFlipHorizontal2,
  IconMediaFastBackwards,
  IconMediaFastForward,
  IconMediaPause,
  IconMediaPlay,
  IconRefresh,
  IconRotateImageClockwise,
  IconSizeLg,
} from "@pond/icons";
import { Button, stepPlaybackRate } from "@pond/ui";
import { useHotkey } from "@tanstack/react-hotkeys";
import type { ReactNode } from "react";
import { ViewerHud } from "@/features/saves/components/viewers/hud";
import { ChromePortal } from "@/features/saves/components/viewers/media-viewer/chrome";
import {
  type ViewerNavigation,
  ViewerNavigationControls,
  ViewerToolbarGroups,
} from "@/features/saves/components/viewers/viewer-toolbar-groups";
import type { useGifPlayer } from "@/features/saves/hooks/use-gif-player";
import { clampGifFrame } from "@/features/saves/lib/gif-loop";
import { ShortcutKeys } from "@/shared/components/shortcut-keys";
import { bindingKeys, useShortcutBindings } from "@/shared/lib/shortcuts";
import type { InspectorMode } from "../types";
import { ZoomPill } from "../zoom-pill";
import styles from "./styles.module.css";

type GifPlayer = ReturnType<typeof useGifPlayer>;

interface HudProps {
  actual: number;
  active: boolean;
  busy: boolean;
  canCrop: boolean;
  itemIndex: number;
  itemTotal: number;
  isGif?: boolean;
  gifFramesOpen?: boolean;
  mode: InspectorMode;
  edits?: "full" | "none";
  endActions?: ReactNode;
  slideNavigation?: ViewerNavigation;
  onActualSize: () => void;
  onApplyCrop: () => void;
  onCancelCrop: () => void;
  onFit: () => void;
  onFlip: () => void;
  onRotate: () => void;
  onSaveCrop: () => void;
  onToggleCrop: () => void;
  onToggleGifFrames?: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomRatio: (ratio: number) => void;
}

function Hud({
  actual,
  active,
  busy,
  canCrop,
  itemIndex,
  itemTotal,
  isGif = false,
  gifFramesOpen = false,
  mode,
  edits = "full",
  endActions,
  slideNavigation,
  onActualSize,
  onApplyCrop,
  onCancelCrop,
  onFit,
  onFlip,
  onRotate,
  onSaveCrop,
  onToggleCrop,
  onToggleGifFrames,
  onZoomIn,
  onZoomOut,
  onZoomRatio,
}: HudProps) {
  const shortcuts = useShortcutBindings();
  useHotkey(bindingKeys(shortcuts, "viewer.zoom-fit"), onFit, {
    enabled: active && mode === "view",
    ignoreInputs: true,
  });
  useHotkey(bindingKeys(shortcuts, "viewer.actual-size"), onActualSize, {
    enabled: active && mode === "view",
    ignoreInputs: true,
  });

  if (!active) return null;
  if (mode === "crop" && edits === "full")
    return (
      <ChromePortal slot="top">
        <ViewerHud.Bar
          label="Crop"
          center={
            <div className={styles.crop}>
              <span className={styles.hint}>Select an area to crop</span>
              <Button
                size="sm"
                variant="primary"
                disabled={busy || !canCrop}
                loading={busy}
                onClick={onApplyCrop}
              >
                Apply Crop
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={busy || !canCrop}
                onClick={onSaveCrop}
              >
                Save as New Image
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={onCancelCrop}
              >
                Cancel
              </Button>
            </div>
          }
        />
      </ChromePortal>
    );

  return (
    <ChromePortal slot="top">
      <ViewerHud.Bar
        label="Image"
        collapseCenter
        start={
          itemIndex >= 0 && itemTotal > 0 ? (
            <ViewerHud.Scale>
              {itemIndex + 1} / {itemTotal}
            </ViewerHud.Scale>
          ) : null
        }
        center={
          <ZoomPill
            actual={actual}
            onOut={onZoomOut}
            onIn={onZoomIn}
            onRatio={onZoomRatio}
          />
        }
        end={
          <ViewerToolbarGroups
            actions={endActions}
            edits={
              edits === "full" ? (
                <>
                  <ViewerHud.Tool label="Flip" disabled={busy} onClick={onFlip}>
                    <IconFlipHorizontal2 />
                  </ViewerHud.Tool>
                  <ViewerHud.Tool
                    label="Rotate"
                    disabled={busy}
                    onClick={onRotate}
                  >
                    <IconRotateImageClockwise />
                  </ViewerHud.Tool>
                  <ViewerHud.Tool label="Crop" onClick={onToggleCrop}>
                    <IconCrop />
                  </ViewerHud.Tool>
                </>
              ) : null
            }
            view={
              <>
                <ViewerHud.Tool
                  label="Actual Size"
                  shortcut={<ShortcutKeys id="viewer.actual-size" />}
                  onClick={onActualSize}
                >
                  <IconSizeLg />
                </ViewerHud.Tool>
                <ViewerHud.Tool
                  label="Fit to Window"
                  shortcut={<ShortcutKeys id="viewer.zoom-fit" />}
                  onClick={onFit}
                >
                  <IconExpand />
                </ViewerHud.Tool>
                {isGif && onToggleGifFrames ? (
                  <ViewerHud.Tool
                    label="GIF Frames"
                    pressed={gifFramesOpen}
                    onClick={onToggleGifFrames}
                  >
                    <IconAnimationFrames />
                  </ViewerHud.Tool>
                ) : null}
              </>
            }
            navigation={
              slideNavigation && slideNavigation.count > 1 ? (
                <div className={styles["slide-navigation"]}>
                  <ViewerNavigationControls navigation={slideNavigation} />
                </div>
              ) : null
            }
          />
        }
      />
    </ChromePortal>
  );
}

interface GifProps {
  active: boolean;
  gif: GifPlayer;
  mode: InspectorMode;
}

function Gif({ active, gif, mode }: GifProps) {
  const shortcuts = useShortcutBindings();
  const hotkeys = {
    enabled: active && gif.ready && mode === "view",
    ignoreInputs: true,
  };
  useHotkey(bindingKeys(shortcuts, "viewer.play-pause"), gif.toggle, hotkeys);
  useHotkey(
    bindingKeys(shortcuts, "viewer.frame-prev"),
    () => gif.seek(gif.frameIndex - 1),
    hotkeys,
  );
  useHotkey(
    bindingKeys(shortcuts, "viewer.frame-next"),
    () => gif.seek(gif.frameIndex + 1),
    hotkeys,
  );
  useHotkey(
    bindingKeys(shortcuts, "viewer.frame-prev-ten"),
    () => gif.seek(gif.frameIndex - 10),
    hotkeys,
  );
  useHotkey(
    bindingKeys(shortcuts, "viewer.frame-next-ten"),
    () => gif.seek(gif.frameIndex + 10),
    hotkeys,
  );
  useHotkey(
    bindingKeys(shortcuts, "viewer.speed-up"),
    () => gif.setRate(stepPlaybackRate(gif.rate, 1)),
    hotkeys,
  );
  useHotkey(
    bindingKeys(shortcuts, "viewer.speed-down"),
    () => gif.setRate(stepPlaybackRate(gif.rate, -1)),
    hotkeys,
  );

  if (!active || !gif.ready || mode !== "view") return null;
  const loopStart = clampGifFrame(gif.loop?.[0] ?? 0, gif.frameCount, gif.loop);
  const loopEnd = clampGifFrame(
    gif.loop?.[1] ?? gif.frameCount - 1,
    gif.frameCount,
    gif.loop,
  );

  return (
    <ChromePortal slot="bottom">
      <ViewerHud.Tools
        tooltipSide="top"
        className={styles.gif}
        role="toolbar"
        aria-label="GIF Controls"
      >
        <ViewerHud.Tool
          label={gif.playing ? "Pause GIF" : "Play GIF"}
          onClick={gif.toggle}
        >
          {gif.playing ? <IconMediaPause /> : <IconMediaPlay />}
        </ViewerHud.Tool>
        <ViewerHud.Tool
          label="Previous Frame"
          disabled={gif.frameIndex <= loopStart}
          onClick={() => gif.seek(gif.frameIndex - 1)}
        >
          <IconMediaFastBackwards />
        </ViewerHud.Tool>
        <ViewerHud.Scale>
          {gif.frameIndex + 1} / {gif.frameCount} · {gif.rate}×
        </ViewerHud.Scale>
        <ViewerHud.Tool
          label="Next Frame"
          disabled={gif.frameIndex >= loopEnd}
          onClick={() => gif.seek(gif.frameIndex + 1)}
        >
          <IconMediaFastForward />
        </ViewerHud.Tool>
        <ViewerHud.Tool label="Set Loop Start" onClick={gif.setLoopStart}>
          <IconMediaFastBackwards />
        </ViewerHud.Tool>
        <ViewerHud.Tool label="Set Loop End" onClick={gif.setLoopEnd}>
          <IconMediaFastForward />
        </ViewerHud.Tool>
        <ViewerHud.Tool
          label="Reset Loop Range"
          disabled={!gif.loop}
          onClick={gif.resetLoop}
        >
          <IconRefresh />
        </ViewerHud.Tool>
      </ViewerHud.Tools>
    </ChromePortal>
  );
}

export const ImageControls = { Gif, Hud };
