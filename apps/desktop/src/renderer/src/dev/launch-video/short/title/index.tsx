import { clamp, ease, progress } from "../../stage/timeline";
import styles from "./styles.module.css";

interface TitleProps {
  t: number;
  enter: number;
  exit: number;
  label: string;
  text: string;
}

/** A step card: a circle opening into a pill, then the line rising under it. */
export function Title({ t, enter, exit, label, text }: TitleProps) {
  if (t < enter || t > exit + 350) return null;
  const dot = ease.outQuint(progress(t, enter, 300));
  const open = ease.inOut(progress(t, enter + 180, 420));
  const rise = ease.outQuint(progress(t, enter + 380, 700));
  const out = ease.in(progress(t, exit, 320));
  return (
    <div
      className={styles.title}
      style={{
        opacity: 1 - out,
        filter: out > 0.01 ? `blur(${out * 8}px)` : undefined,
      }}
    >
      <span
        className={styles.pill}
        style={{
          opacity: clamp(dot * 2),
          transform: `scale(${0.6 + dot * 0.4})`,
          clipPath: `inset(0 calc((100% - 38px) * ${1 - open}) 0 0 round 999px)`,
        }}
      >
        <span style={{ opacity: clamp((open - 0.4) / 0.6) }}>{label}</span>
      </span>
      <span className={styles.mask}>
        <span
          className={styles.text}
          style={{ transform: `translateY(${(1 - rise) * 105}%)` }}
        >
          {text}
        </span>
      </span>
    </div>
  );
}
