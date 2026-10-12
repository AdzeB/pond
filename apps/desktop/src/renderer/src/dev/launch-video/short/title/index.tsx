import { Words } from "../../stage/line";
import { clamp, ease, progress } from "../../stage/timeline";
import styles from "./styles.module.css";

interface TitleProps {
  t: number;
  enter: number;
  exit: number;
  label: string;
  text: string;
}

/** A step card: a dot opening into a label, then the line fading in word by word. */
export function Title({ t, enter, exit, label, text }: TitleProps) {
  if (t < enter || t > exit + 400) return null;
  const dot = ease.outQuint(progress(t, enter, 300));
  const open = ease.inOut(progress(t, enter + 160, 420));
  const out = ease.in(progress(t, exit, 320));
  return (
    <div className={styles.title}>
      <span
        className={styles.pill}
        style={{
          opacity: clamp(dot * 2) * (1 - out),
          filter: out > 0.01 ? `blur(${out * 8}px)` : undefined,
          transform: `scale(${0.6 + dot * 0.4})`,
          clipPath: `inset(0 calc((100% - 40px) * ${1 - open}) 0 0 round 999px)`,
        }}
      >
        <span style={{ opacity: clamp((open - 0.4) / 0.6) }}>{label}</span>
      </span>
      <span className={styles.text}>
        <Words
          t={t}
          text={text}
          enter={enter + 300}
          exit={exit}
          stagger={70}
          out={320}
        />
      </span>
    </div>
  );
}
