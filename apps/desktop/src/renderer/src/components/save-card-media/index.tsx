import { memo, useCallback, useMemo, useState } from "react";
import { useIsVideoDownloading } from "@/hooks/use-is-video-downloading";
import { useResolvedTheme } from "@/hooks/use-resolved-theme";
import { buildMediaUnits, pickPrimaryUnit } from "@/lib/media";
import { useSensitiveMedia } from "@/lib/nsfw";
import type { Save } from "@/lib/types";
import { withThumbWidth } from "@/lib/url";
import { usePrefs } from "@/stores/prefs";
import { CardImage } from "./card-image";
import { CARD_THUMB_WIDTH } from "./constants";
import { DownloadingBadge } from "./downloading-badge";
import { HoverGallery } from "./hover-gallery";
import { HoverVideo } from "./hover-video";
import { SensitiveOverlay } from "./sensitive-overlay";
import styles from "./styles.module.css";

export type CardLayout = "waterfall" | "grid" | "justified";

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

  // Build the image-only cycle list for multi-image saves. Disabled when the primary
  // is a video, when there's only one image, or when the cover isn't one of these
  // images (e.g. a forced tweet-screenshot cover), so the resting frame stays correct.
  const slides = useMemo(() => {
    if (!unit || unit.isVideo) return null;
    const units = buildMediaUnits(save, {
      theme,
      tweetCover: preferences?.tweetCover,
    });
    const images = units.filter((u) => !u.isVideo);
    if (images.length < 2) return null;
    const idx = images.findIndex((u) => u.url === unit.url);
    if (idx < 0) return null;
    if (idx === 0) return images;
    const reordered = [...images];
    const [primary] = reordered.splice(idx, 1);
    if (primary) reordered.unshift(primary);
    return reordered;
  }, [unit, save, theme, preferences?.tweetCover]);

  const [active, setActive] = useState(0);
  const [seen, setSeen] = useState<ReadonlySet<number>>(() => new Set([0]));

  // Map the pointer's horizontal position across the thumb to a slide index, so
  // hovering "scrubs" through the set. Handlers live here (not on the gallery) so
  // moves over the badge overlay still bubble up and register.
  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Don't scrub frames while the cover is still blurred — scrubbing would
      // load and surface other sensitive frames underneath the overlay.
      if (!slides || blurred) return;
      const rect = e.currentTarget.getBoundingClientRect();
      if (rect.width === 0) return;
      const ratio = (e.clientX - rect.left) / rect.width;
      const i = Math.min(
        slides.length - 1,
        Math.max(0, Math.floor(ratio * slides.length)),
      );
      setActive((prev) => (prev === i ? prev : i));
      setSeen((prev) => (prev.has(i) ? prev : new Set(prev).add(i)));
    },
    [slides, blurred],
  );

  const onPointerLeave = useCallback(() => setActive(0), []);

  // Track broken src (not a boolean) so swapping unit URL auto-clears the broken state.
  const pickedSrc = unit?.url ?? null;
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null);
  const broken = brokenSrc !== null && brokenSrc === pickedSrc;
  const onBroken = useCallback(() => setBrokenSrc(pickedSrc), [pickedSrc]);

  const safeActive = slides ? Math.min(active, slides.length - 1) : 0;

  return (
    <div
      className={styles.thumb}
      data-layout={layout}
      data-multi-media={slides && !broken ? "true" : undefined}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      {slides && !broken ? (
        <HoverGallery
          save={save}
          slides={slides}
          active={safeActive}
          seen={seen}
          onBroken={onBroken}
        />
      ) : unit && !broken && !unit.isVideo ? (
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
