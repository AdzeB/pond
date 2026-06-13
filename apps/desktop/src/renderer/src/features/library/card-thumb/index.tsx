import { IconEyeOutline18 as Eye } from "@pond/icons/outline/18";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInViewRef, useMergeRefs } from "rooks";
import { useIsVideoDownloading } from "@/core/data/downloads";
import { type MediaUnit, pickPrimaryUnit } from "@/core/data/media";
import { useSensitiveMedia } from "@/core/data/nsfw";
import { usePrefs } from "@/core/data/prefs";
import { useResolvedTheme } from "@/core/data/theme";
import type { Save } from "@/core/data/types";
import { withThumbWidth } from "@/core/data/url";
import { recordAspect } from "@/features/library/stores/aspect";
import styles from "./styles.module.css";

export type CardLayout = "waterfall" | "grid" | "justified";

// Single thumbnail width bucket keeps the on-disk cache key stable; detail view loads originals.
const CARD_THUMB_WIDTH = 768;

export const CardThumb = memo(function CardThumb({
  save,
  layout,
}: {
  save: Save;
  layout?: CardLayout;
}) {
  const theme = useResolvedTheme();
  const [preferences] = usePrefs("preferences");
  const unit = useMemo(
    () => pickPrimaryUnit(save, { theme, tweetCover: preferences?.tweetCover }),
    [save, theme, preferences?.tweetCover],
  );
  const isDownloading = useIsVideoDownloading(save);
  const { blurred, reveal } = useSensitiveMedia(save);

  // Track broken src (not a boolean) so swapping unit URL auto-clears the broken state.
  const pickedSrc = unit?.url ?? null;
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null);
  const broken = brokenSrc !== null && brokenSrc === pickedSrc;
  const onBroken = useCallback(() => setBrokenSrc(pickedSrc), [pickedSrc]);

  return (
    <div className={styles.thumb} data-layout={layout}>
      {unit && !broken && !unit.isVideo ? (
        <CardImage key={unit.url} save={save} unit={unit} onBroken={onBroken} />
      ) : null}
      {unit?.isVideo && !broken ? (
        <HoverVideo
          saveId={save.id}
          src={unit.url}
          posterUrl={
            unit.posterUrl
              ? withThumbWidth(unit.posterUrl, CARD_THUMB_WIDTH)
              : undefined
          }
          label={save.title ?? "video"}
          onBroken={onBroken}
        />
      ) : null}
      {!unit || broken ? (
        <div className={styles.placeholder} aria-hidden />
      ) : null}
      <DownloadingBadge save={save} isDownloading={isDownloading} />
      {blurred && !broken && unit ? (
        <SensitiveOverlay onReveal={reveal} />
      ) : null}
    </div>
  );
});

function CardImage({
  save,
  unit,
  onBroken,
}: {
  save: Save;
  unit: MediaUnit;
  onBroken: () => void;
}) {
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  const file = save.files.find((f) => f.path === unit.key);
  const w = file?.width ?? save.width ?? undefined;
  const h = file?.height ?? save.height ?? undefined;

  useEffect(() => {
    const img = ref.current;
    if (!img) return;
    if (img.complete && img.naturalWidth > 0) {
      recordAspect(save.id, img.naturalWidth, img.naturalHeight);
      setLoaded(true);
    }
  }, [save.id]);

  return (
    <img
      ref={ref}
      src={withThumbWidth(unit.url, CARD_THUMB_WIDTH)}
      alt=""
      loading="lazy"
      decoding="async"
      // Grid thumbs are background work; don't starve the foreground detail image.
      fetchPriority="low"
      width={w}
      height={h}
      className={styles.media}
      data-loaded={loaded ? "true" : "false"}
      onLoad={(e) => {
        const img = e.currentTarget;
        recordAspect(save.id, img.naturalWidth, img.naturalHeight);
        setLoaded(true);
      }}
      onError={onBroken}
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

function DownloadingBadge({
  save,
  isDownloading,
}: {
  save: Save;
  isDownloading: boolean;
}) {
  if (save.status === "failed") {
    const lastError =
      save.tasks?.find((t) => t.status === "failed")?.lastError ?? "Failed";
    return (
      <span
        className={styles.failed}
        role="status"
        aria-label="Ingest failed"
        title={lastError}
      >
        Failed
      </span>
    );
  }
  if (!isDownloading) return null;
  const fetchVideo = save.tasks?.find((t) => t.op === "fetch_video_ytdlp");
  const label = fetchVideo?.status === "running" ? "Downloading" : "Queued";
  return (
    <span
      className={styles.downloading}
      role="status"
      aria-label={`${label} video`}
      title={`${label} video…`}
    >
      <span className={styles["downloading-dot"]} aria-hidden="true" />
      {label}
    </span>
  );
}

function SensitiveOverlay({ onReveal }: { onReveal: () => void }) {
  return (
    <button
      type="button"
      className={styles.sensitive}
      aria-label="Reveal sensitive media"
      title="Sensitive media — click to reveal"
      onClick={(e) => {
        // Reveal in place instead of opening the save.
        e.preventDefault();
        e.stopPropagation();
        onReveal();
      }}
    >
      <Eye width={16} height={16} aria-hidden />
    </button>
  );
}
