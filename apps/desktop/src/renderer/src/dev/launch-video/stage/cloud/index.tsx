import { CLOUD, cover } from "../media";
import { BEATS, clamp, ease, mix, progress } from "../timeline";
import styles from "./styles.module.css";

/** Stage position, width, and depth (0 far, 1 near) for each drifting save. */
const TILES: readonly (readonly [number, number, number, number])[] = [
  [210, 190, 180, 0.6],
  [520, 120, 140, 0.3],
  [860, 170, 120, 0.2],
  [1250, 110, 160, 0.4],
  [1620, 200, 200, 0.7],
  [120, 560, 150, 0.4],
  [1780, 560, 140, 0.3],
  [300, 860, 200, 0.8],
  [690, 900, 150, 0.4],
  [1080, 870, 130, 0.25],
  [1440, 860, 190, 0.7],
  [1700, 930, 120, 0.2],
  [430, 360, 110, 0.15],
  [1500, 370, 110, 0.15],
];

const CENTER = { x: 960, y: 540 };

/** Saves drifting around the opening line, then pulled into one place. */
export function Cloud({ t }: { t: number }) {
  const [start, end] = BEATS.hook;
  if (t > end + 300) return null;
  const gather = ease.in(progress(t, end - 700, 900));
  return (
    <div className={styles.cloud} aria-hidden>
      {TILES.map(([x, y, width, depth], index) => {
        const id = CLOUD[index % CLOUD.length];
        if (!id) return null;
        const enter = ease.out(progress(t, start + index * 60, 900));
        const drift = (t - start) * (0.012 + depth * 0.02);
        const sway = Math.sin((t - start) / 900 + index) * 6 * (0.4 + depth);
        const left = mix(x + sway, CENTER.x, gather);
        const top = mix(y - drift + (1 - enter) * 40, CENTER.y, gather);
        const scale = mix(1, 0.2, gather) * (0.94 + 0.06 * enter);
        return (
          <img
            key={`${x}-${y}`}
            alt=""
            src={cover(id)}
            className={styles.tile}
            style={{
              width,
              height: width * 1.25,
              transform: `translate(${left - width / 2}px, ${top - width * 0.625}px) scale(${scale})`,
              opacity:
                enter * (0.45 + depth * 0.55) * (1 - clamp(gather * 1.4)),
              filter:
                depth < 0.35 ? `blur(${(0.35 - depth) * 8}px)` : undefined,
              zIndex: Math.round(depth * 10),
            }}
          />
        );
      })}
    </div>
  );
}
