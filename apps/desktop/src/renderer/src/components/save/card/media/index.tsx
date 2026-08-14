import { memo, useCallback, useEffect, useMemo, useState } from "react";
import type { GridLayout } from "@/components/library/layouts/grid";
import { DownloadingBadge } from "@/components/save/card/media/downloading-badge";
import { HoverGallery } from "@/components/save/card/media/hover-gallery";
import { HoverVideo } from "@/components/save/card/media/hover-video";
import { CardImage } from "@/components/save/card/media/image";
import { useIsVideoDownloading } from "@/hooks/use-is-video-downloading";
import { useMediaPickOptions } from "@/hooks/use-media-pick-options";
import { buildMediaUnits, pickPrimaryUnit } from "@/lib/media/units";
import { ensureTextCover } from "@/lib/save/ensure-text-cover";
import { isTextOnlySave, textBodyForSave } from "@/lib/save/text";
import type { Save } from "@/lib/types";
import styles from "./styles.module.css";

export type CardLayout = GridLayout;

/**
 * Resting original plus a stored blurhash until it decodes.
 * Hover gallery and video stay opt-in.
 */
export const CardThumb = memo(function CardThumb({
  save,
  layout,
}: {
  save: Save;
  layout?: CardLayout;
}) {
  const pickOpts = useMediaPickOptions();
  const unit = useMemo(() => pickPrimaryUnit(save, pickOpts), [save, pickOpts]);
  const hasVideoDims = useMemo(() => {
    if (!unit?.isVideo) return false;
    const primary = (save.files ?? []).find((f) => f.path === unit.key) ?? null;
    if (
      primary?.width &&
      primary?.height &&
      primary.width > 0 &&
      primary.height > 0
    ) {
      return true;
    }
    return Boolean(
      save.width && save.height && save.width > 0 && save.height > 0,
    );
  }, [save.files, save.height, save.width, unit]);
  const isDownloading = useIsVideoDownloading(save);
  const pending = save.status === "ingesting" && !isDownloading;

  useEffect(() => {
    ensureTextCover(save);
  }, [save]);

  const slides = useMemo(() => {
    if (!unit || unit.isVideo) return null;
    const units = buildMediaUnits(save, pickOpts);
    const images = units.filter((u) => !u.isVideo);
    if (images.length < 2) return null;
    const idx = images.findIndex((u) => u.url === unit.url);
    if (idx < 0) return null;
    if (idx === 0) return images;
    const reordered = [...images];
    const [primary] = reordered.splice(idx, 1);
    if (primary) reordered.unshift(primary);
    return reordered;
  }, [unit, save, pickOpts]);

  const [active, setActive] = useState(0);
  const [seen, setSeen] = useState<ReadonlySet<number>>(() => new Set([0]));

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!slides) return;
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
    [slides],
  );

  const onPointerLeave = useCallback(() => setActive(0), []);

  const pickedSrc = unit?.url ?? null;
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null);
  const broken = brokenSrc !== null && brokenSrc === pickedSrc;
  const onBroken = useCallback(() => setBrokenSrc(pickedSrc), [pickedSrc]);

  const safeActive = slides ? Math.min(active, slides.length - 1) : 0;
  const showPlaceholder = !unit || broken;
  const textPreview =
    showPlaceholder && isTextOnlySave(save) ? textBodyForSave(save) : null;

  return (
    <div
      className={styles.thumb}
      data-layout={layout}
      data-pending={pending || undefined}
      data-multi-media={slides && !broken ? "true" : undefined}
      aria-busy={pending || undefined}
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
          key={unit.url}
          saveId={save.id}
          src={unit.url}
          unit={unit}
          posterUrl={unit.posterUrl}
          blurhash={save.blurhash}
          hasVideoDims={hasVideoDims}
          label={save.title ?? "video"}
          onBroken={onBroken}
        />
      ) : null}
      {showPlaceholder ? (
        textPreview ? (
          <div className={styles.textPreview}>
            <span className={styles.textPreviewBody}>{textPreview}</span>
          </div>
        ) : (
          <div className={styles.placeholder} aria-hidden />
        )
      ) : null}
      <DownloadingBadge save={save} isDownloading={isDownloading} />
    </div>
  );
});
