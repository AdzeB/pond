import { useCallback, useEffect, useRef, useState } from "react";
import { useInViewRef, useMergeRefs } from "rooks";
import styles from "@/components/save-card-media/styles.module.css";
import { recordAspect } from "@/stores/aspect";

export function HoverVideo({
  saveId,
  src,
  posterUrl,
  label,
  onBroken,
}: {
  saveId: string;
  src: string;
  posterUrl?: string;
  label: string;
  onBroken: () => void;
}) {
  const internalRef = useRef<HTMLVideoElement | null>(null);

  // Merge the in-view callback ref with the controllable ref; rootMargin primes media before it scrolls in.
  const [inViewRef, inView] = useInViewRef({ rootMargin: "200px" });
  const setVideoRef = useMergeRefs<HTMLVideoElement>(internalRef, inViewRef);

  const [primed, setPrimed] = useState(false);
  useEffect(() => {
    if (inView && !primed) setPrimed(true);
  }, [inView, primed]);

  const onEnter = useCallback(() => {
    const el = internalRef.current;
    if (!el) return;
    const promise = el.play();
    if (promise && typeof promise.catch === "function") {
      promise.catch(() => {});
    }
  }, []);

  const onLeave = useCallback(() => {
    const el = internalRef.current;
    if (!el) return;
    el.pause();
    try {
      el.currentTime = 0;
    } catch {
      // Seek can throw if metadata hasn't loaded yet; safe to ignore.
    }
  }, []);

  const onLoadedMetadata = useCallback(() => {
    const el = internalRef.current;
    if (!el) return;
    if (el.readyState < HTMLMediaElement.HAVE_METADATA) return;
    if (el.videoWidth === 0 && el.videoHeight === 0) {
      onBroken();
      return;
    }
    recordAspect(saveId, el.videoWidth, el.videoHeight);
  }, [onBroken, saveId]);

  return (
    <video
      ref={setVideoRef}
      {...(primed ? { src } : {})}
      poster={posterUrl}
      muted
      loop
      playsInline
      preload={primed ? "metadata" : "none"}
      className={styles.media}
      aria-label={label}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      onError={onBroken}
      onLoadedMetadata={onLoadedMetadata}
    >
      <track kind="captions" />
    </video>
  );
}
