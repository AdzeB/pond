import type { RefObject } from "react";
import { clamp, ease, mix, progress } from "../../../stage/timeline";
import styles from "./styles.module.css";

const SWATCHES = [
  ["none", "#3d3d3d", "#ffffff", "#bdbdbd", "#a48057", "#f6a6c8"],
  ["#ff6b5b", "#ffb86b", "#ffd84d", "#6fcf97", "#6fd3e0", "#5b9bff", "#a08bff"],
];
const BROWN = "#a48057";

/** The default pick and the brown swatch, as hue plus saturation and value. */
const FROM = { hue: 36, s: 0.96, v: 1, hex: "#FF9F0A" };
const TO = { hue: 32, s: 0.47, v: 0.64, hex: "#A48057" };

interface PickerProps {
  t: number;
  open: number;
  pick: number;
  close: number;
  left: number;
  top: number;
  ref?: RefObject<HTMLDivElement | null>;
  swatch?: RefObject<HTMLSpanElement | null>;
}

/** Pond's color filter popover, opening under its chip and picking brown. */
export function Picker({
  t,
  open,
  pick,
  close,
  left,
  top,
  ref,
  swatch,
}: PickerProps) {
  const a = ease.outQuint(progress(t, open, 520));
  const b = ease.in(progress(t, close, 260));
  const shown = a * (1 - b);
  const k = ease.inOut(progress(t, pick, 360));
  const picked = t >= pick;
  const hue = mix(FROM.hue, TO.hue, k);
  return (
    <div
      ref={ref}
      className={styles.picker}
      style={{
        left,
        top,
        opacity: clamp(shown * 1.4),
        filter: shown < 0.98 ? `blur(${(1 - shown) * 6}px)` : undefined,
        transform: `translateY(${(1 - a) * -10 + b * -6}px) scale(${mix(0.94, 1, a)})`,
        visibility: shown <= 0.002 ? "hidden" : undefined,
      }}
    >
      <div className={styles.field}>
        <span
          className={styles.square}
          style={{
            background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hue} 100% 50%))`,
          }}
        >
          <i
            className={styles.knob}
            style={{
              left: `${mix(FROM.s, TO.s, k) * 100}%`,
              top: `${(1 - mix(FROM.v, TO.v, k)) * 100}%`,
            }}
          />
        </span>
        <span className={styles.hue}>
          <i
            className={styles.knob}
            style={{ left: "50%", top: `${(hue / 360) * 100}%` }}
          />
        </span>
      </div>
      {SWATCHES.map((row) => (
        <div key={row.join()} className={styles.swatches}>
          {row.map((color) => (
            <span
              key={color}
              ref={color === BROWN ? swatch : undefined}
              className={styles.swatch}
              data-none={color === "none" || undefined}
              data-selected={(color === BROWN && picked) || undefined}
              style={color === "none" ? undefined : { background: color }}
            />
          ))}
        </div>
      ))}
      <div className={styles.hex}>
        <span
          className={styles.chip}
          style={{ background: picked ? BROWN : FROM.hex }}
        />
        {picked ? TO.hex : FROM.hex}
      </div>
      <div className={styles.accuracy}>
        Accuracy
        <span className={styles.track}>
          <i />
        </span>
      </div>
    </div>
  );
}
