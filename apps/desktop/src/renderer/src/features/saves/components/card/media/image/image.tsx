import { useCallback } from "react";
import { BlurHash } from "@/features/saves/components/card/media/blur-hash/blur-hash";
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
import styles from "./image.module.css";

export function CardImage({
  save,
  unit,
  pickOptions,
  width,
  onBroken,
  onReady,
}: {
  save: Save;
  unit: MediaUnit;
  pickOptions: MediaPickOptions;
  width?: number;
  onBroken: () => void;
  onReady?: () => void;
}) {
  const { w, h } = aspectDimsFor(save, pickOptions, unit);
  const src = unit.requiresGeneratedPreview
    ? previewThumbUrlFor(unit.url, width)
    : thumbUrlFor(unit.url, width);
  const reportReady = useCallback(
    (image: HTMLImageElement) => {
      recordAspect(save.id, image.naturalWidth, image.naturalHeight, {
        coverKey: aspectCoverKey(unit),
      });
      onReady?.();
    },
    [onReady, save.id, unit],
  );
  const ready = useImageReady(src, reportReady);

  return (
    <>
      {save.blurhash && !ready.loaded ? (
        <BlurHash hash={save.blurhash} />
      ) : null}
      <img
        ref={ready.ref}
        src={src}
        alt=""
        decoding="async"
        fetchPriority="auto"
        width={w ?? undefined}
        height={h ?? undefined}
        className={styles.media}
        data-loaded={!save.blurhash || ready.loaded ? "true" : "false"}
        onLoad={ready.onLoad}
        onError={onBroken}
      />
    </>
  );
}
