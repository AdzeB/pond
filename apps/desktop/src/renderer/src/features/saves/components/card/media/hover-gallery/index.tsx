import { useCallback, useState } from "react";
import { BlurHash } from "@/features/saves/components/card/media/blur-hash";
import { useImageReady } from "@/features/saves/components/card/media/lib/use-image-ready";
import type {
  MediaPickOptions,
  MediaUnit,
} from "@/features/saves/lib/media/units";
import {
  previewThumbUrlFor,
  thumbUrlFor,
} from "@/features/saves/lib/media/url";
import {
  aspectCoverKey,
  aspectDimsFor,
  recordAspect,
} from "@/features/saves/state/aspect";
import type { Save } from "@/features/saves/types";
import styles from "./styles.module.css";

export function HoverGallery({
  save,
  slides,
  pickOptions,
  active,
  seen,
  width,
  onBroken,
  onReady,
}: {
  save: Save;
  slides: MediaUnit[];
  pickOptions: MediaPickOptions;
  active: number;
  seen: ReadonlySet<number>;
  width?: number;
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
            pickOptions={pickOptions}
            primary={i === 0}
            active={i === active}
            width={width}
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
  pickOptions,
  primary,
  active,
  width,
  onBroken,
  onReady,
}: {
  save: Save;
  unit: MediaUnit;
  pickOptions: MediaPickOptions;
  primary: boolean;
  active: boolean;
  width?: number;
  onBroken: () => void;
  onReady?: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const dims = primary ? aspectDimsFor(save, pickOptions, unit) : null;
  const w = dims?.w ?? undefined;
  const h = dims?.h ?? undefined;
  const src = unit.requiresGeneratedPreview
    ? previewThumbUrlFor(unit.url, width)
    : thumbUrlFor(unit.url, width);
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
