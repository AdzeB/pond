import { COLOR_PRESETS } from "@pond/schema/filters/color";
import styles from "../styles.module.css";
import type { BodyProps } from "../types";

export function ColorBody({ predicate, onChange }: BodyProps) {
  const active = typeof predicate.value === "string" ? predicate.value : "";

  return (
    <div className={styles.body} data-variant="narrow">
      <div className={styles.swatches}>
        {COLOR_PRESETS.map((c) => (
          <button
            key={c.hex}
            type="button"
            title={c.label}
            aria-label={c.label}
            className={styles.swatch}
            style={{ background: c.hex }}
            data-active={
              active.toLowerCase() === c.hex.toLowerCase() ? "true" : undefined
            }
            onClick={() =>
              onChange({ ...predicate, operator: "near", value: c.hex })
            }
          />
        ))}
      </div>
    </div>
  );
}
