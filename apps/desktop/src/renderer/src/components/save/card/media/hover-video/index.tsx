import { useCallback, useEffect, useRef, useState } from "react";
import { BlurHash } from "@/components/save/card/media/blur-hash";
import { useImageReady } from "@/components/save/card/media/lib/use-image-ready";
import type { MediaUnit } from "@/lib/media/units";
import { aspectCoverKey, recordAspect } from "@/stores/aspect";
import styles from "./styles.module.css";

function seekToStart(el: HTMLVideoElement) {
  try {
    el.currentTime = 0;
  } catch {}
}

export function HoverVideo({
  saveId,
  src,
  unit,
  posterUrl,
  blurhash,
  label,
  onBroken,
  onReady,
  hasVideoDims = false,
}: {
  saveId: string;
  src: string;
  unit: MediaUnit;
  posterUrl?: string;
  blurhash?: string | null;
  label: string;
  onBroken: () => void;
  onReady?: () => void;
  hasVideoDims?: boolean;
}) {
  const internalRef = useRef<HTMLVideoElement | null>(null);
  const [hoverPrimed, setHoverPrimed] = useState(false);
  const [active, setActive] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [posterBroken, setPosterBroken] = useState(false);
  const coverKey = aspectCoverKey(unit);
  const effectivePosterUrl = posterBroken ? undefined : posterUrl;
  const needsRestingVideo = !effectivePosterUrl;
  const primed = hoverPrimed || needsRestingVideo;

  const reportPosterReady = useCallback(
    (image: HTMLImageElement) => {
      /** Platform posters can disagree with the stream (YouTube Shorts 16:9 blur composites). */
      if (!hasVideoDims) {
        recordAspect(saveId, image.naturalWidth, image.naturalHeight, {
          coverKey,
        });
      }
      onReady?.();
    },
    [coverKey, hasVideoDims, onReady, saveId],
  );
  const poster = useImageReady(effectivePosterUrl ?? null, reportPosterReady);

  useEffect(() => {
    if (!active || !primed) return;
    const el = internalRef.current;
    if (!el) return;
    const promise = el.play();
    if (promise && typeof promise.catch === "function") {
      promise.catch(() => {});
    }
  }, [active, primed]);

  const onEnter = useCallback(() => {
    setActive(true);
    setHoverPrimed(true);
  }, []);

  const onLeave = useCallback(() => {
    setActive(false);
    const el = internalRef.current;
    if (!el) return;
    el.pause();
    seekToStart(el);
  }, []);

  const onLoadedMetadata = useCallback(() => {
    const el = internalRef.current;
    if (!el) return;
    if (el.readyState < HTMLMediaElement.HAVE_METADATA) return;
    if (el.videoWidth === 0 && el.videoHeight === 0) {
      onBroken();
      return;
    }
    recordAspect(saveId, el.videoWidth, el.videoHeight, {
      coverKey,
      soft: Boolean(effectivePosterUrl),
    });
    if (needsRestingVideo) {
      seekToStart(el);
      onReady?.();
      setVideoReady(true);
    }
  }, [
    coverKey,
    effectivePosterUrl,
    needsRestingVideo,
    onBroken,
    onReady,
    saveId,
  ]);

  const showHash =
    Boolean(blurhash) && (effectivePosterUrl ? !poster.loaded : !videoReady);

  return (
    <>
      {showHash && blurhash ? <BlurHash hash={blurhash} /> : null}
      {effectivePosterUrl ? (
        <img
          ref={poster.ref}
          src={effectivePosterUrl}
          alt=""
          decoding="async"
          fetchPriority="auto"
          className={styles.poster}
          data-loaded={!blurhash || poster.loaded ? "true" : "false"}
          draggable={false}
          onLoad={poster.onLoad}
          onError={() => setPosterBroken(true)}
        />
      ) : null}
      <video
        ref={internalRef}
        {...(primed ? { src } : {})}
        muted
        loop
        playsInline
        preload={primed ? "metadata" : "none"}
        className={styles.media}
        data-active={active ? "true" : undefined}
        data-ready={videoReady ? "true" : undefined}
        data-resting={needsRestingVideo && videoReady ? "true" : undefined}
        aria-label={label}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        onFocus={onEnter}
        onBlur={onLeave}
        onError={onBroken}
        onLoadedMetadata={onLoadedMetadata}
        onPlaying={() => setVideoReady(true)}
      >
        <track kind="captions" />
      </video>
    </>
  );
}
