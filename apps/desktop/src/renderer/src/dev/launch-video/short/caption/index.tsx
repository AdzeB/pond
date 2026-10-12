import { ease, mix, progress } from "../../stage/timeline";
import styles from "./styles.module.css";

const GRAY = 196;
const INK = 17;

interface CaptionProps {
  t: number;
  /** One or more lines, split on `\n`. */
  text: string;
  enter: number;
  exit: number;
  y?: number;
  stagger?: number;
}

/** A stable 0 to 1 value per letter, so the dissolve is the same on every frame. */
const scatter = (index: number) => {
  const x = Math.sin(index * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/** Plain centered type: words arrive gray and settle to ink, then the letters dissolve. */
export function Caption({
  t,
  text,
  enter,
  exit,
  y = 540,
  stagger = 80,
}: CaptionProps) {
  if (t < enter - 50 || t > exit + 500) return null;
  let word = 0;
  let letter = 0;
  return (
    <div className={styles.caption} style={{ top: y }}>
      {text.split("\n").map((line) => (
        <div key={line} className={styles.line}>
          {line.split(" ").map((part) => {
            const at = enter + word++ * stagger;
            const show = progress(t, at, 360);
            const ink = ease.inOut(progress(t, at + 140, 480));
            const tone = Math.round(mix(GRAY, INK, ink));
            return (
              <span
                key={`${word}-${part}`}
                className={styles.word}
                style={{
                  opacity: ease.out(show),
                  color: `rgb(${tone} ${tone} ${tone})`,
                  transform: `translateY(${(1 - ease.outQuint(show)) * 10}px)`,
                }}
              >
                {[...part].map((char) => {
                  const k = letter++;
                  const gone = progress(t, exit + scatter(k) * 280, 160);
                  return (
                    <span key={k} style={{ opacity: 1 - gone }}>
                      {char}
                    </span>
                  );
                })}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}
