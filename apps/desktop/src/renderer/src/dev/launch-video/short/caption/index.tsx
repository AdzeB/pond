import { envelope, styled } from "../../stage/timeline";
import { CAPTION_Y } from "../timeline";
import styles from "./styles.module.css";

interface Line {
  text: string;
  /** When this line starts entering. It holds until the next one, or the caption's exit. */
  at: number;
}

interface CaptionProps {
  t: number;
  label: string;
  lines: readonly Line[];
  exit: number;
}

/** A step pill and the line beside it, under a product shot. */
export function Caption({ t, label, lines, exit }: CaptionProps) {
  const enter = lines[0]?.at ?? 0;
  if (t < enter || t > exit + 400) return null;
  const pill = envelope(t, enter, exit, { rise: 12 });
  return (
    <div className={styles.caption} style={{ top: CAPTION_Y }}>
      <span className={styles.pill} style={styled(pill)}>
        {label}
      </span>
      <span className={styles.lines}>
        {lines.map((line, i) => {
          const next = lines[i + 1]?.at ?? exit + 50;
          const e = envelope(t, line.at + 80, next - 50, {
            rise: 12,
            out: 250,
          });
          return (
            <span key={line.text} className={styles.line} style={styled(e)}>
              {line.text}
            </span>
          );
        })}
      </span>
    </div>
  );
}
