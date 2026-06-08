import { useCallback, useEffect, useRef, useState } from "react";
import { useInViewRef, useMergeRefs } from "rooks";
import { recordAspect } from "@/lib/stores/aspect";
import { useCardContext } from "../context";
import styles from "./styles.module.css";

export function Video() {
  const { state, actions } = useCardContext();
  if (!state.unit?.isVideo || state.isBroken) return null;
  return (
    <HoverVideo
      saveId={state.save.id}
      src={state.unit.url}
      posterUrl={state.unit.posterUrl}
      label={state.save.title ?? "video"}
      onBroken={() => actions.setBroken(true)}
    />
  );
}

function HoverVideo({
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
  onBroken: (videoSrc?: string) => void;
}) {
  const internalRef = useRef<HTMLVideoElement | null>(null);

  // `useInViewRef` hands back a callback ref; merge it with the
  // controllable `internalRef` (used for play/pause/seek) so a single
  // `<video>` element feeds both. `rootMargin` primes media slightly
  // before it scrolls into view.
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
      onBroken(src);
      return;
    }
    recordAspect(saveId, el.videoWidth, el.videoHeight);
  }, [onBroken, saveId, src]);

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
      onError={() => onBroken(src)}
      onLoadedMetadata={onLoadedMetadata}
    >
      <track kind="captions" />
    </video>
  );
}
