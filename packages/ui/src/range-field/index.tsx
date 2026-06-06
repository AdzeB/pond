import { cn } from "../_shared/cn";
import { Slider } from "../slider";
import styles from "./styles.module.css";

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}

interface RangeFieldProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  "aria-label": string;
  onValueChange: (next: number) => void;
  className?: string;
}

export function RangeField({
  value,
  min,
  max,
  step = 1,
  suffix = "",
  "aria-label": ariaLabel,
  onValueChange,
  className,
}: RangeFieldProps) {
  const safe = Number.isFinite(value) ? value : min;

  return (
    <div className={cn(styles.root, className)}>
      <Slider.Root
        min={min}
        max={max}
        step={step}
        value={safe}
        onValueChange={(next) => {
          const n = typeof next === "number" ? next : next[0];
          if (n !== undefined) onValueChange(clamp(n, min, max));
        }}
        className={styles.slider}
      >
        <Slider.Control className={styles["track-control"]}>
          <Slider.Track className={styles.track}>
            <Slider.Indicator className={styles.indicator} />
            <Slider.Thumb aria-label={ariaLabel} className={styles.thumb} />
          </Slider.Track>
        </Slider.Control>
      </Slider.Root>
      <span className={styles.value}>
        {safe}
        {suffix}
      </span>
    </div>
  );
}
