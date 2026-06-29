import { useEffect, useRef } from "react";
import { CARD_THUMB_WIDTH } from "@/components/save-card-media/lib/constants";
import styles from "@/components/save-card-media/styles.module.css";
import type { MediaUnit } from "@/lib/media/units";
import { withThumbWidth } from "@/lib/media/url";
import type { Save } from "@/lib/types";
import { recordAspect } from "@/stores/aspect";

// Layered, crossfading image stack for multi-image saves. The parent (CardThumb)
// owns the active index / seen set and drives them from pointer scrubbing, so this
// stays presentational. `slides[0]` is the primary (resting) image.
export function HoverGallery({
  save,
  slides,
  active,
  seen,
  onBroken,
}: {
  save: Save;
  slides: MediaUnit[];
  active: number;
  seen: ReadonlySet<number>;
  onBroken: () => void;
}) {
  return (
    <>
      {slides.map((unit, i) =>
        seen.has(i) ? (
          <GallerySlide
            key={unit.url}
            save={save}
            unit={unit}
            primary={i === 0}
            active={i === active}
            onBroken={onBroken}
          />
        ) : null,
      )}
      <div className={styles.dots} aria-hidden="true">
        {slides.map((unit, i) => (
          <span
            key={unit.url}
            className={styles.dot}
            data-active={i === active ? "true" : undefined}
          />
        ))}
      </div>
    </>
  );
}

function GallerySlide({
  save,
  unit,
  primary,
  active,
  onBroken,
}: {
  save: Save;
  unit: MediaUnit;
  primary: boolean;
  active: boolean;
  onBroken: () => void;
}) {
  const ref = useRef<HTMLImageElement>(null);

  // Only the primary slide feeds the card's aspect ratio; secondaries must not override it.
  const file = save.files.find((f) => f.path === unit.key);
  const w = primary ? (file?.width ?? save.width ?? undefined) : undefined;
  const h = primary ? (file?.height ?? save.height ?? undefined) : undefined;

  useEffect(() => {
    if (!primary) return;
    const img = ref.current;
    if (img?.complete && img.naturalWidth > 0) {
      recordAspect(save.id, img.naturalWidth, img.naturalHeight);
    }
  }, [primary, save.id]);

  return (
    <img
      ref={ref}
      src={withThumbWidth(unit.url, CARD_THUMB_WIDTH)}
      alt=""
      loading="lazy"
      decoding="async"
      fetchPriority="low"
      width={w}
      height={h}
      className={styles.slide}
      data-active={active ? "true" : undefined}
      onLoad={(e) => {
        if (!primary) return;
        const img = e.currentTarget;
        recordAspect(save.id, img.naturalWidth, img.naturalHeight);
      }}
      onError={primary ? onBroken : undefined}
    />
  );
}
