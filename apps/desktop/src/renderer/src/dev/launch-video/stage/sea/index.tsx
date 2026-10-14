import { BRANDS, type Brand } from "../brands";
import { cover, SAMPLES } from "../media";
import { clamp, ease, mix } from "../timeline";
import styles from "./styles.module.css";

const CENTER = [960, 540] as const;
const RING = 14;
/** Authored in the old cut's seconds, which played 1.15× faster. */
const SPEED = 1.15 / 1000;

function random(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let x = Math.imul(state ^ (state >>> 15), 1 | state);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function spring(s: number, w = 12, z = 0.55) {
  if (s <= 0) return 0;
  const wd = w * Math.sqrt(1 - z * z);
  return (
    1 -
    Math.exp(-z * w * s) *
      (Math.cos(wd * s) + ((z * w) / wd) * Math.sin(wd * s))
  );
}

interface Tile {
  id: string;
  brand: Brand;
  z: number;
  w: number;
  h: number;
  x: number;
  y: number;
  drift: number;
  phase: number;
  rotate: number;
  enter: number;
  ring: number;
}

function layout(): Tile[] {
  const r = random(11);
  const tiles: Omit<Tile, "ring">[] = [];
  let tries = 0;
  while (tiles.length < 40 && tries < 20000) {
    tries++;
    const z = r();
    const entry = SAMPLES[(tiles.length * 7) % SAMPLES.length];
    if (!entry) break;
    const w = mix(118, 250, z);
    const h = w / entry.aspect;
    const x = mix(-60, 1980, r());
    const y = mix(-30, 1110, r());
    const drift = 14 + 34 * z;
    const band =
      y + h / 2 > 405 &&
      y - h / 2 < 675 &&
      x + w / 2 > 230 &&
      x - w / 2 - drift * 3 < 1690;
    if (band) continue;
    if (
      tiles.some(
        (o) =>
          Math.hypot(o.x - x, o.y - y) < 0.46 * (o.w + w + o.h * 0.4 + h * 0.4),
      )
    )
      continue;
    tiles.push({
      id: entry.id,
      brand: BRANDS[tiles.length % BRANDS.length] ?? BRANDS[0],
      z,
      w,
      h,
      x,
      y,
      drift,
      phase: r() * 6.28,
      rotate: (r() - 0.5) * 7,
      enter: 0.02 + r() * 0.55,
    });
  }
  const ringers = [...tiles].sort((a, b) => b.z - a.z).slice(0, RING);
  ringers.sort(
    (a, b) =>
      Math.atan2(a.y - CENTER[1], a.x - CENTER[0]) -
      Math.atan2(b.y - CENTER[1], b.x - CENTER[0]),
  );
  return tiles
    .map((tile) => ({ ...tile, ring: ringers.indexOf(tile) }))
    .sort((a, b) => a.z - b.z);
}

const TILES = layout();

function place(tile: Tile, s: number) {
  const pin = spring(s - tile.enter, 11, 0.62);
  const sx = tile.x - tile.drift * s;
  const sy = tile.y + Math.sin(s * 0.9 + tile.phase) * 7;
  let x = sx;
  let y = sy;
  let w = tile.w;
  let rotate = tile.rotate + Math.sin(s * 0.6 + tile.phase) * 1.2;
  let opacity = clamp((s - tile.enter) * 5) * mix(0.55, 1, tile.z);
  let blur = (1 - tile.z) * 2.6;
  if (s > 2.8) {
    if (tile.ring >= 0) {
      const pa = ease.inOut(clamp((s - 2.8 - tile.ring * 0.012) / 0.75));
      const pb = clamp((s - 3.55) / 0.61);
      const angle = (2 * Math.PI * tile.ring) / RING - Math.PI / 2;
      const spin = 1.5 * (s - 2.8) + 4.2 * pb * pb;
      const radius = 310 * (1 - ease.in(pb));
      x = mix(sx, CENTER[0] + Math.cos(angle + spin) * radius, pa);
      y = mix(sy, CENTER[1] + Math.sin(angle + spin) * radius, pa);
      w = mix(tile.w, 112, pa) * mix(1, 0.2, ease.in(pb));
      rotate = mix(rotate, 0, pa);
      blur = mix(blur, 0, pa);
      opacity = mix(opacity, 1, pa) * (1 - clamp((s - 3.98) / 0.18));
    } else {
      const p = ease.in(clamp((s - 2.8) / 0.55));
      const d = Math.hypot(sx - CENTER[0], sy - CENTER[1]) || 1;
      x = sx + ((sx - CENTER[0]) / d) * 800 * p;
      y = sy + ((sy - CENTER[1]) / d) * 800 * p;
      opacity *= 1 - p;
      blur += 6 * p;
    }
  }
  const k = (w / tile.w) * mix(0.72, 1, pin);
  return {
    opacity,
    transform: `translate(${x - tile.w / 2}px, ${y - tile.h / 2}px) scale(${k}) rotate(${rotate}deg)`,
    filter: blur > 0.05 ? `blur(${blur}px)` : undefined,
  };
}

/** Saves from every source drifting around the opening line, then spiralling into the center. */
export function Sea({ t }: { t: number }) {
  const s = t * SPEED;
  if (s > 4.3) return null;
  return (
    <div className={styles.sea}>
      {TILES.map((tile) => (
        <div
          key={`${tile.x}-${tile.y}`}
          className={styles.tile}
          style={{ width: tile.w, height: tile.h, ...place(tile, s) }}
        >
          <img alt="" src={cover(tile.id)} className={styles.image} />
          <tile.brand.Icon className={styles.badge} />
        </div>
      ))}
    </div>
  );
}
