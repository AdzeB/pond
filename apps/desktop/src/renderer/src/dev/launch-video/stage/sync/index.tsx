import { BRANDS } from "../brands";
import { cover, SAMPLES } from "../media";
import {
  BEATS,
  clamp,
  closes,
  ease,
  envelope,
  mix,
  progress,
  styled,
} from "../timeline";
import styles from "./styles.module.css";

const START = BEATS.sync[0] + 2980;
const EXIT = closes("sync");
const TILE = 72;
const TILE_GAP = 26;
const ROW_Y = 140;
const COLUMNS = 10;
const GUTTER = 16;
const WALL_X = 40;
const WALL_Y = 300;
const COLUMN = (1840 - (COLUMNS - 1) * GUTTER) / COLUMNS;
const CARDS = 40;
const TOTAL = 5070;
const FLIGHT = 750;

const iconX = (k: number) =>
  960 -
  (BRANDS.length * TILE + (BRANDS.length - 1) * TILE_GAP) / 2 +
  k * (TILE + TILE_GAP) +
  TILE / 2;

const FLOW = START + 950;
const SPAN = 2200;

const CARDS_LAID = (() => {
  const heights = Array.from({ length: COLUMNS }, () => WALL_Y);
  return Array.from({ length: CARDS }, (_, k) => {
    const entry = SAMPLES[(k * 5 + 3) % SAMPLES.length] ?? SAMPLES[0];
    if (!entry) throw new Error("sync: no samples");
    const column = heights.indexOf(Math.min(...heights));
    const h = COLUMN / entry.aspect;
    const y = heights[column] ?? WALL_Y;
    heights[column] = y + h + GUTTER;
    return {
      id: entry.id,
      source: k % BRANDS.length,
      x: WALL_X + column * (COLUMN + GUTTER),
      y,
      h,
      launch: FLOW + SPAN * Math.sqrt(k / CARDS),
      spin: ((k * 37) % 25) - 12,
    };
  });
})();

/** Every connected source feeding one wall of saves, while the count follows the landings. */
export function Sync({ t }: { t: number }) {
  if (t < START - 100 || t > EXIT + 400) return null;
  const out = envelope(t, START, EXIT, { duration: 1, rise: 0 });
  let landed = 0;
  for (const card of CARDS_LAID) {
    landed += progress(t, card.launch + FLIGHT * 0.55, 250);
  }
  const count = Math.round((TOTAL * landed) / CARDS);
  const counter = envelope(t, START + 850, EXIT, { rise: 12 });
  return (
    <div className={styles.scene} style={styled(out)}>
      {CARDS_LAID.map((card) => {
        const p = ease.outQuint(progress(t, card.launch, FLIGHT));
        if (t < card.launch) return null;
        const sx = iconX(card.source) - COLUMN / 2;
        const sy = ROW_Y - card.h / 2;
        const bx = mix(sx, card.x, p);
        const by = mix(sy, card.y, p) - Math.sin(p * Math.PI) * 60;
        const Brand = BRANDS[card.source]?.Icon;
        return (
          <div
            key={card.id + card.launch}
            className={styles.card}
            style={{
              width: COLUMN,
              height: card.h,
              opacity: clamp(p * 5),
              transform: `translate(${bx}px, ${by}px) scale(${mix(0.22, 1, p)}) rotate(${(1 - p) * card.spin}deg)`,
              filter: p < 0.9 ? `blur(${(1 - p) * 3}px)` : undefined,
            }}
          >
            <img alt="" src={cover(card.id)} className={styles.image} />
            {Brand ? <Brand className={styles.badge} /> : null}
          </div>
        );
      })}
      {BRANDS.map(({ id, Icon }, k) => (
        <span
          key={id}
          className={styles.source}
          style={{
            left: iconX(k) - TILE / 2,
            ...styled(envelope(t, START + k * 60, EXIT, { duration: 600 })),
          }}
        >
          <Icon className={styles.logo} />
        </span>
      ))}
      <p className={styles.count} style={styled(counter)}>
        <span>{count.toLocaleString("en-US")}</span>{" "}
        <span className={styles.unit}>saves</span>
      </p>
    </div>
  );
}
