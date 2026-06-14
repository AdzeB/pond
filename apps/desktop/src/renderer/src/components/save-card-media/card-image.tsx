import { useEffect, useRef, useState } from "react";
import type { MediaUnit } from "@/lib/media";
import type { Save } from "@/lib/types";
import { withThumbWidth } from "@/lib/url";
import { recordAspect } from "@/stores/aspect";
import { CARD_THUMB_WIDTH } from "./constants";
import styles from "./styles.module.css";

export function CardImage({
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
