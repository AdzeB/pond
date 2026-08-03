import { pickPrimaryUnit } from "@/lib/media/units";
import { withThumbWidth } from "@/lib/media/url";
import type { Save } from "@/lib/types";
import styles from "./thumb.module.css";

export function Thumb({ save }: { save: Save }) {
  const unit = pickPrimaryUnit(save);
  if (unit && !unit.isVideo) {
    return (
      <img
        className={styles.thumb}
        src={withThumbWidth(unit.url, 48)}
        alt=""
        loading="lazy"
        draggable={false}
      />
    );
  }
  const color = save.dominantColors?.[0];
  return (
    <span
      className={styles.thumb}
      style={color ? { background: color } : undefined}
    />
  );
}
