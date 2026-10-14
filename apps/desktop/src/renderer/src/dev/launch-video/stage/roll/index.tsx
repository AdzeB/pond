import { useRef } from "react";
import { useLayout } from "../layout";
import { Words } from "../line";
import { clamp, ease, envelope, mix, progress, styled } from "../timeline";
import styles from "./styles.module.css";

interface RollProps {
  t: number;
  lead: string;
  items: readonly string[];
  enter: number;
  exit: number;
  /** When the slot starts turning, and how long each item rests. */
  start: number;
  cadence: number;
}

/** A sentence whose last words roll through alternatives, the neighbours ghosted above and below. */
export function Roll({
  t,
  lead,
  items,
  enter,
  exit,
  start,
  cadence,
}: RollProps) {
  const measure = useRef<HTMLSpanElement>(null);
  const widths = useLayout(
    () =>
      [...(measure.current?.children ?? [])].map(
        (child) => (child as HTMLElement).offsetWidth,
      ),
    [] as number[],
  );
  let focus = 0;
  for (let k = 1; k < items.length; k++) {
    focus += ease.inOut(progress(t, start + k * cadence - 320, 320));
  }
  const base = Math.floor(focus);
  const width = mix(
    widths[base] ?? 0,
    widths[base + 1] ?? widths[base] ?? 0,
    focus - base,
  );
  const slot = envelope(t, enter + 300, exit + 60, { rise: 14 });
  const live = t >= enter - 50 && t <= exit + 900;
  return (
    <div
      className={styles.line}
      style={{ visibility: live ? undefined : "hidden" }}
    >
      <Words t={t} text={lead} enter={enter} exit={exit} stagger={60} />
      <span className={styles.slot} style={{ width, ...styled(slot) }}>
        {items.map((item, k) => {
          const d = k - focus;
          return (
            <span
              key={item}
              className={styles.item}
              style={{
                transform: `translateY(${d * 1.05}em)`,
                opacity: clamp(1 - Math.abs(d) * 0.72),
                filter:
                  Math.abs(d) > 0.05
                    ? `blur(${Math.min(Math.abs(d), 1.5) * 3}px)`
                    : undefined,
              }}
            >
              {item}
            </span>
          );
        })}
      </span>
      <span ref={measure} className={styles.measure} aria-hidden>
        {items.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </span>
    </div>
  );
}
