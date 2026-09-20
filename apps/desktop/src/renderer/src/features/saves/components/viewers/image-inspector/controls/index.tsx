import {
  IconContrastFill18,
  IconCropFill18,
  IconExpandFill18,
  IconFlipHorizontal2Fill18,
  IconMediaFastBackwardsFill18,
  IconMediaFastForwardFill18,
  IconMediaPauseFill18,
  IconMediaPlayFill18,
  IconPencilFill18,
  IconRefreshFill18,
  IconRotateImageClockwiseFill18,
} from "@pond/icons/fill/18";
import { IconSizeLgOutline18 } from "@pond/icons/outline/18";
import { Button, stepPlaybackRate, Tray } from "@pond/ui";
import { useHotkey } from "@tanstack/react-hotkeys";
import { ViewerHud } from "@/features/saves/components/viewers/hud";
import { ChromePortal } from "@/features/saves/components/viewers/media-viewer/chrome/chrome";
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
  grayscale: boolean;
  mode: InspectorMode;
  transformMode: "preview" | "file";
  onActualSize: () => void;
  onApplyCrop: () => void;
  onCancelCrop: () => void;
  onDetach: () => void;
  onFit: () => void;
  onFlip: () => void;
  onReset: () => void;
  onRotate: () => void;
  onPresent: () => void;
  onSaveCrop: () => void;
  onToggleComment: () => void;
  onToggleCrop: () => void;
  onToggleGrayscale: () => void;
  onTransformModeChange: (mode: "preview" | "file") => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

function Hud({
  actual,
  active,
  busy,
  canCrop,
  grayscale,
  mode,
  transformMode,
  onActualSize,
  onApplyCrop,
  onCancelCrop,
  onDetach,
  onFit,
  onFlip,
  onReset,
  onRotate,
  onPresent,
  onSaveCrop,
  onToggleComment,
  onToggleCrop,
  onToggleGrayscale,
  onTransformModeChange,
  onZoomIn,
  onZoomOut,
}: HudProps) {
  const shortcuts = useShortcutBindings();
  useHotkey(bindingKeys(shortcuts, "viewer.comment"), onToggleComment, {
    enabled: active,
    ignoreInputs: true,
  });
  useHotkey(bindingKeys(shortcuts, "viewer.zoom-fit"), onFit, {
    enabled: active && mode === "view",
    ignoreInputs: true,
  });
  useHotkey(bindingKeys(shortcuts, "viewer.actual-size"), onActualSize, {
    enabled: active && mode === "view",
    ignoreInputs: true,
  });

  if (!active) return null;
  if (mode === "crop")
    return (
      <ChromePortal slot="top">
        <ViewerHud.Tools
          tooltipSide="bottom"
          className={styles.crop}
          role="toolbar"
          aria-label="Crop"
        >
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
        </ViewerHud.Tools>
      </ChromePortal>
    );

  return (
    <ChromePortal slot="top">
      <ViewerHud.Tools
        tooltipSide="bottom"
        className={styles.toolbar}
        role="toolbar"
        aria-label="Image"
      >
        <div className={styles.start}>
          <Button
            size="sm"
            variant={transformMode === "preview" ? "secondary" : "ghost"}
            aria-pressed={transformMode === "preview"}
            onClick={() => onTransformModeChange("preview")}
          >
            Preview Only
          </Button>
          <Button
            size="sm"
            variant={transformMode === "file" ? "secondary" : "ghost"}
            aria-pressed={transformMode === "file"}
            onClick={() => onTransformModeChange("file")}
          >
            Apply to File
          </Button>
          <Tray.Separator />
          <ViewerHud.Tool label="Crop" onClick={onToggleCrop}>
            <IconCropFill18 />
          </ViewerHud.Tool>
          <ViewerHud.Tool
            label="Comment"
            shortcut={<ShortcutKeys id="viewer.comment" />}
            pressed={mode === "comment"}
            onClick={onToggleComment}
          >
            <IconPencilFill18 />
          </ViewerHud.Tool>
          <Tray.Separator />
          <ViewerHud.Tool label="Rotate" disabled={busy} onClick={onRotate}>
            <IconRotateImageClockwiseFill18 />
          </ViewerHud.Tool>
          <ViewerHud.Tool label="Flip" disabled={busy} onClick={onFlip}>
            <IconFlipHorizontal2Fill18 />
          </ViewerHud.Tool>
          <ViewerHud.Tool
            label="Grayscale"
            pressed={grayscale}
            onClick={onToggleGrayscale}
          >
            <IconContrastFill18 />
          </ViewerHud.Tool>
        </div>
        <div className={styles.center}>
          <ZoomPill actual={actual} onOut={onZoomOut} onIn={onZoomIn} />
        </div>
        <div className={styles.end}>
          <Button size="sm" variant="ghost" onClick={onPresent}>
            Present
          </Button>
          <Button size="sm" variant="ghost" onClick={onDetach}>
            Detach
          </Button>
          <Tray.Separator />
          <ViewerHud.Tool
            label="Actual Size"
            shortcut={<ShortcutKeys id="viewer.actual-size" />}
            onClick={onActualSize}
          >
            <IconSizeLgOutline18 />
          </ViewerHud.Tool>
          <ViewerHud.Tool
            label="Fit"
            shortcut={<ShortcutKeys id="viewer.zoom-fit" />}
            onClick={onFit}
          >
            <IconExpandFill18 />
          </ViewerHud.Tool>
          <Tray.Separator />
          <ViewerHud.Tool label="Reset" disabled={busy} onClick={onReset}>
            <IconRefreshFill18 />
          </ViewerHud.Tool>
        </div>
      </ViewerHud.Tools>
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
          {gif.playing ? <IconMediaPauseFill18 /> : <IconMediaPlayFill18 />}
        </ViewerHud.Tool>
        <ViewerHud.Tool
          label="Previous Frame"
          disabled={gif.frameIndex <= loopStart}
          onClick={() => gif.seek(gif.frameIndex - 1)}
        >
          <IconMediaFastBackwardsFill18 />
        </ViewerHud.Tool>
        <ViewerHud.Scale>
          {gif.frameIndex + 1} / {gif.frameCount} · {gif.rate}×
        </ViewerHud.Scale>
        <ViewerHud.Tool
          label="Next Frame"
          disabled={gif.frameIndex >= loopEnd}
          onClick={() => gif.seek(gif.frameIndex + 1)}
        >
          <IconMediaFastForwardFill18 />
        </ViewerHud.Tool>
        <Tray.Separator />
        <ViewerHud.Tool label="Set Loop Start" onClick={gif.setLoopStart}>
          <IconMediaFastBackwardsFill18 />
        </ViewerHud.Tool>
        <ViewerHud.Tool label="Set Loop End" onClick={gif.setLoopEnd}>
          <IconMediaFastForwardFill18 />
        </ViewerHud.Tool>
        <ViewerHud.Tool
          label="Reset Loop Range"
          disabled={!gif.loop}
          onClick={gif.resetLoop}
        >
          <IconRefreshFill18 />
        </ViewerHud.Tool>
      </ViewerHud.Tools>
    </ChromePortal>
  );
}

export const ImageControls = { Gif, Hud };
