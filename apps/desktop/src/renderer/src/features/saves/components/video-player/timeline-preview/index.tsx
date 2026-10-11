import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./styles.module.css";

export function TimelinePreview({ src, time }: { src: string; time: number }) {
  const preview = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);

  const seek = useCallback(
    (video: HTMLVideoElement) => {
      if (!Number.isFinite(video.duration) || video.duration <= 0) return;
      setReady(false);
      video.currentTime = Math.min(time, Math.max(0, video.duration - 0.001));
    },
    [time],
  );

  useEffect(() => {
    const video = preview.current;
    if (!video || video.readyState < HTMLMediaElement.HAVE_METADATA) return;
    const request = requestAnimationFrame(() => seek(video));
    return () => cancelAnimationFrame(request);
  }, [seek]);

  return (
    <video
      ref={preview}
      src={src}
      className={styles.preview}
      style={{ aspectRatio: "16 / 9" }}
      preload="metadata"
      muted
      playsInline
      aria-hidden
      data-ready={ready || undefined}
      onLoadedMetadata={(event) => seek(event.currentTarget)}
      onSeeked={() => setReady(true)}
    />
  );
}
