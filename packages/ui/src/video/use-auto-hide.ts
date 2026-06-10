import { useCallback, useEffect, useRef, useState } from "react";

const HIDE_DELAY_MS = 2500;

// Reveals the controls on pointer activity and hides them again after a beat of
// inactivity while playing. Paused video always keeps the controls visible.
export function useAutoHide(opts: {
  rootRef: React.RefObject<HTMLDivElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  playing: boolean;
}): { controlsVisible: boolean; showControls: () => void } {
  const { rootRef, videoRef, playing } = opts;
  const [controlsVisible, setControlsVisible] = useState(true);
  const timer = useRef<number | null>(null);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const v = videoRef.current;
      if (v && !v.paused) setControlsVisible(false);
    }, HIDE_DELAY_MS);
  }, [videoRef]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onActivity = () => showControls();
    const onLeave = () => {
      const v = videoRef.current;
      if (v && !v.paused) setControlsVisible(false);
    };
    root.addEventListener("pointermove", onActivity);
    root.addEventListener("pointerenter", onActivity);
    root.addEventListener("pointerleave", onLeave);
    return () => {
      root.removeEventListener("pointermove", onActivity);
      root.removeEventListener("pointerenter", onActivity);
      root.removeEventListener("pointerleave", onLeave);
    };
  }, [rootRef, videoRef, showControls]);

  useEffect(() => {
    if (playing) showControls();
    else setControlsVisible(true);
  }, [playing, showControls]);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  return { controlsVisible, showControls };
}
