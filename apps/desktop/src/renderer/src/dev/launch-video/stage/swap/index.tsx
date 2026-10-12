import { useRef } from "react";
import { useLayout } from "../layout";
import { BEATS, ease, envelope, mix, progress, styled } from "../timeline";
import styles from "./styles.module.css";

const LEAD = "Your own";
const PHRASES = [
  "social media archive.",
  "asset manager.",
  "project organizer.",
  "file manager.",
  "anything.",
];
const GAP = 17;
const ENTER = BEATS.tagline[0];
const STEP = 600;
const EXIT = BEATS.tagline[1] - 400;

/** "Your own" with the rest of the line swapping in place. */
export function Swap({ t }: { t: number }) {
  const lead = useRef<HTMLSpanElement>(null);
  const items = useRef<(HTMLSpanElement | null)[]>([]);
  const size = useLayout(
    () => ({
      lead: lead.current?.offsetWidth ?? 0,
      items: items.current.map((item) => item?.offsetWidth ?? 0),
    }),
    { lead: 0, items: [] as number[] },
  );
  const live = t >= ENTER - 50 && t <= EXIT + 400;
  const e = envelope(t, ENTER, EXIT, { rise: 14 });
  let width = size.items[0] ?? 0;
  for (let k = 1; k < PHRASES.length; k++) {
    const at = ENTER + k * STEP;
    width = mix(
      width,
      size.items[k] ?? 0,
      ease.inOut(progress(t, at - 150, 500)),
    );
  }
  const x = 960 - (size.lead + GAP + width) / 2;
  return (
    <div
      className={styles.swap}
      style={{ visibility: live ? undefined : "hidden" }}
    >
      <span
        ref={lead}
        className={styles.part}
        style={styled(e, `translate(${x}px, 540px) translateY(-50%)`)}
      >
        {LEAD}
      </span>
      {PHRASES.map((phrase, k) => {
        const at = ENTER + k * STEP;
        const next = k + 1 < PHRASES.length ? at + STEP : null;
        const ie =
          k === 0
            ? envelope(t, ENTER, (next ?? EXIT) - 200, { rise: 14, out: 300 })
            : envelope(t, at - 50, next ? next - 200 : EXIT, {
                duration: 550,
                rise: 34,
                out: 300,
              });
        return (
          <span
            key={phrase}
            ref={(element) => {
              items.current[k] = element;
            }}
            className={styles.part}
            style={styled(
              ie,
              `translate(${x + size.lead + GAP}px, 540px) translateY(-50%)`,
            )}
          >
            {phrase}
          </span>
        );
      })}
    </div>
  );
}
