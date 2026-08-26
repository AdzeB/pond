import { useCallback, useState } from "react";
import { BlurHash } from "@/components/save/card/media/blur-hash";
import { useImageReady } from "@/components/save/card/media/lib/use-image-ready";
import type { MediaUnit } from "@/lib/media/units";
import type { Save } from "@/lib/types";
import { aspectCoverKey, aspectDimsFor, recordAspect } from "@/stores/aspect";
import styles from "./styles.module.css";

export function HoverGallery({
  save,
  slides,
  active,
  seen,
  onBroken,
  onReady,
}: {
  save: Save;
  slides: MediaUnit[];
  active: number;
  seen: ReadonlySet<number>;
  onBroken: () => void;
  onReady?: () => void;
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
            onReady={onReady}
          />
        ) : null,
      )}
    </>
  );
}

function GallerySlide({
  save,
  unit,
  primary,
  active,
  onBroken,
  onReady,
}: {
  save: Save;
  unit: MediaUnit;
  primary: boolean;
  active: boolean;
  onBroken: () => void;
  onReady?: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const dims = primary ? aspectDimsFor(save, {}, unit) : null;
  const w = dims?.w ?? undefined;
  const h = dims?.h ?? undefined;
  const src = unit.url;
  const reportReady = useCallback(
    (image: HTMLImageElement) => {
      if (!primary) return;
      recordAspect(save.id, image.naturalWidth, image.naturalHeight, {
        coverKey: aspectCoverKey(unit),
      });
      onReady?.();
    },
    [onReady, primary, save.id, unit],
  );
  const ready = useImageReady(src, reportReady);

  if (failed && !primary) return null;

  return (
    <>
      {primary && save.blurhash && !ready.loaded ? (
        <BlurHash hash={save.blurhash} />
      ) : null}
      <img
        ref={ready.ref}
        src={src}
        alt=""
        loading={primary ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={primary ? "auto" : "low"}
        width={w}
        height={h}
        className={styles.slide}
        data-active={active && !failed ? "true" : undefined}
        data-loaded={!save.blurhash || ready.loaded ? "true" : "false"}
        onLoad={ready.onLoad}
        onError={
          primary
            ? onBroken
            : () => {
                setFailed(true);
              }
        }
      />
    </>
  );
}
