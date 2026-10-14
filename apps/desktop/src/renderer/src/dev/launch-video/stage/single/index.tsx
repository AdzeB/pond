import { ease, progress } from "../timeline";
import styles from "./styles.module.css";

interface SingleProps {
  t: number;
  text: string;
  enter: number;
  exit: number;
  cadence: number;
}

/** A sentence read one big word at a time, each landing as the last one blurs away. */
export function Single({ t, text, enter, exit, cadence }: SingleProps) {
  if (t < enter - 50 || t > exit + 500) return null;
  const words = text.split(" ");
  return words.map((word, k) => {
    const at = enter + k * cadence;
    const next = k === words.length - 1 ? exit : at + cadence;
    const a = ease.outQuint(progress(t, at, 360));
    const b = ease.in(progress(t, next - 40, 160));
    if (t < at || b >= 1) return null;
    return (
      <span
        // biome-ignore lint/suspicious/noArrayIndexKey: words are static per line
        key={k}
        className={styles.word}
        style={{
          opacity: Math.min(1, a * 2) * (1 - b),
          transform: `translate(-50%, -50%) scale(${0.9 + a * 0.1 + b * 0.06})`,
          filter:
            a < 0.95 || b > 0 ? `blur(${(1 - a) * 10 + b * 8}px)` : undefined,
        }}
      >
        {word}
      </span>
    );
  });
}
