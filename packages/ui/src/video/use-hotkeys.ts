import { useEffect } from "react";
import type { VideoActions } from "./context";
import { SEEK_HOTKEY_STEP, SPEED_OPTIONS, VOLUME_HOTKEY_STEP } from "./lib";

function stepRate(current: number, delta: 1 | -1): number {
  const idx = SPEED_OPTIONS.indexOf(current as (typeof SPEED_OPTIONS)[number]);
  const base = idx < 0 ? SPEED_OPTIONS.indexOf(1) : idx;
  const next = Math.min(SPEED_OPTIONS.length - 1, Math.max(0, base + delta));
  return SPEED_OPTIONS[next] ?? 1;
}

// Keyboard shortcuts scoped to the focused player. Mirrors the common video
// hotkey set: play/seek/volume/speed/frame-step plus PiP and fullscreen.
export function useVideoHotkeys(opts: {
  rootRef: React.RefObject<HTMLDivElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  actions: VideoActions;
}): void {
  const { rootRef, videoRef, actions } = opts;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.composedPath()[0];
      const onButton = target instanceof HTMLButtonElement;
      if (onButton && (event.key === " " || event.key === "Enter")) return;

      const v = videoRef.current;
      let handled = true;
      switch (event.key) {
        case "k":
        case "K":
        case " ":
          actions.togglePlay();
          break;
        case "m":
        case "M":
          actions.toggleMute();
          break;
        case "f":
        case "F":
          actions.toggleFullscreen();
          break;
        case "p":
        case "P":
          actions.requestPip();
          break;
        case "ArrowLeft":
          actions.seekBy(-SEEK_HOTKEY_STEP);
          break;
        case "ArrowRight":
          actions.seekBy(SEEK_HOTKEY_STEP);
          break;
        case "ArrowUp":
          actions.setVolume((v?.volume ?? 0) + VOLUME_HOTKEY_STEP);
          break;
        case "ArrowDown":
          actions.setVolume((v?.volume ?? 0) - VOLUME_HOTKEY_STEP);
          break;
        case ">":
          actions.setRate(stepRate(v?.playbackRate ?? 1, 1));
          break;
        case "<":
          actions.setRate(stepRate(v?.playbackRate ?? 1, -1));
          break;
        case ".":
          actions.stepFrame(1);
          break;
        case ",":
          actions.stepFrame(-1);
          break;
        default:
          if (/^[0-9]$/.test(event.key) && v && Number.isFinite(v.duration)) {
            actions.seek((Number(event.key) / 10) * v.duration);
          } else {
            handled = false;
          }
      }

      if (handled) {
        event.preventDefault();
        actions.showControls();
      }
    };

    root.addEventListener("keydown", onKeyDown);
    return () => root.removeEventListener("keydown", onKeyDown);
  }, [rootRef, videoRef, actions]);
}
