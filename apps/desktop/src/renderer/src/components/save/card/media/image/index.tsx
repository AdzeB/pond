import { useCallback } from "react";
import { BlurHash } from "@/components/save/card/media/blur-hash";
import { useImageReady } from "@/components/save/card/media/lib/use-image-ready";
import type { MediaUnit } from "@/lib/media/units";
import type { Save } from "@/lib/types";
import { aspectCoverKey, aspectDimsFor, recordAspect } from "@/stores/aspect";
import styles from "./styles.module.css";

export function CardImage({
  save,
  unit,
  onBroken,
  onReady,
}: {
  save: Save;
  unit: MediaUnit;
  onBroken: () => void;
  onReady?: () => void;
}) {
  const { w, h } = aspectDimsFor(save, {}, unit);
  const src = unit.url;
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
