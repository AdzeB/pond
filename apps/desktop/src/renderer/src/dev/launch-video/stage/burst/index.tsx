import { FILTER_AT, SEND_AT, toStage } from "../camera";
import { cover, sample } from "../media";
import { clamp, closes, ease, lift, mix, opens, progress } from "../timeline";
import { is } from "../variant";
import styles from "./styles.module.css";

/** When the bookmark lands in the Save beat. */
export const SAVED = opens("save") + 1610;
/** How long the saved post takes to reach the extension. */
export const LANDED = SAVED + 1000;

interface Pose {
  x: number;
  y: number;
  w: number;
  h: number;
  scale?: number;
  rx?: number;
  ry?: number;
  rz?: number;
  opacity?: number;
  depth?: number;
}

function Card({ id, pose }: { id: string; pose: Pose }) {
  const opacity = pose.opacity ?? 1;
  if (opacity <= 0.002) return null;
  const depth = pose.depth ?? 0;
  return (
    <div
      className={styles.card}
      style={{
        width: pose.w,
        height: pose.h,
        opacity,
        transform: `translate(${pose.x - pose.w / 2}px, ${pose.y - pose.h / 2}px) perspective(1400px) rotateX(${pose.rx ?? 0}deg) rotateY(${pose.ry ?? 0}deg) rotateZ(${pose.rz ?? 0}deg) scale(${pose.scale ?? 1})`,
        boxShadow: `0 0 0 1px rgb(0 0 0 / 0.06), 0 ${12 + depth * 40}px ${24 + depth * 60}px -${10 + depth * 10}px rgb(0 0 0 / ${0.18 + depth * 0.14})`,
      }}
    >
      <img alt="" src={cover(id)} className={styles.image} />
    </div>
  );
}

const POST = sample("gm");
const MEDIA = { x: 921, y: 649, w: 574, h: 300 };
const EXTENSION = { x: 1562, y: 319 };

/** The bookmarked photo peels off the post and drops into the Pond extension. */
function Save({ t }: { t: number }) {
  const u = t - SAVED;
  if (u < 0 || u > 1100) return null;
  const a = ease.outQuint(progress(u, 0, 380));
  const f = ease.inOut(progress(u, 330, 650));
  return (
    <Card
      id={POST.id}
      pose={{
        x: mix(MEDIA.x, EXTENSION.x, f),
        y: mix(MEDIA.y - a * 26, EXTENSION.y, f) - Math.sin(f * Math.PI) * 120,
        w: MEDIA.w,
        h: MEDIA.h,
        scale: mix(1 + a * 0.05, 0.05, f),
        rx: a * 14 * (1 - f),
        ry: f * -18,
        rz: mix(-4 * a, 14, f),
        opacity: 1 - clamp((f - 0.75) / 0.25),
        depth: a * (1 - f),
      }}
    />
  );
}

/** Frame rects of the first Brown results, beside the open colour picker. */
const BROWN = [
  { id: "01M1Z5EJM0DK2SN3NBPY1SKNYD", x: 529, y: 153, w: 124, h: 187 },
  { id: "01M1Z7ARH640SW82TER5WYB80W", x: 669, y: 153, w: 124, h: 166 },
  { id: "01M1Z5EJM4EJSHHMAQGT0583JE", x: 809, y: 153, w: 124, h: 187 },
  { id: "01KV6PPCBZVPNCR2E2GCM7BJHM", x: 950, y: 153, w: 124, h: 221 },
];
const FAN = [
  { x: 820, y: 600, rz: -9, ry: 16 },
  { x: 1050, y: 560, rz: -3, ry: 6 },
  { x: 1280, y: 560, rz: 3, ry: -6 },
  { x: 1510, y: 600, rz: 9, ry: -16 },
];

/** The matching saves lift off the grid and fan out in front of the window. */
function Find({ t }: { t: number }) {
  const start = FILTER_AT + 760;
  if (t < start) return null;
  const w = lift(t, opens("find"), closes("find"));
  return BROWN.map((tile, k) => {
    const from = toStage(tile.x + tile.w / 2, tile.y + tile.h / 2);
    const to = FAN[k] ?? { x: from.x, y: from.y, rz: 0, ry: 0 };
    const width = (tile.w * 1280) / 881;
    const height = (tile.h * 1280) / 881;
    const p = ease.outQuint(progress(t, start + k * 70, 750));
    return (
      <Card
        key={tile.id}
        id={tile.id}
        pose={{
          x: mix(from.x, to.x, p),
          y: mix(from.y, to.y, p) - Math.sin(p * Math.PI) * 60,
          w: width,
          h: height,
          scale: mix(1, 1.3, p),
          rx: Math.sin(p * Math.PI) * 18,
          ry: to.ry * p,
          rz: to.rz * p,
          opacity: w.opacity,
          depth: p,
        }}
      />
    );
  });
}

const CITED = [
  "The interior of the Zweifel graphic design studio",
  "Studio organization featured by Minimalissimo.",
  "A wicker chair designed by John Dickinson.",
].map((title) => sample(title));
/** Where each citation number lands in the streamed answer, and when. */
const CITES = [
  { x: 879, y: 589, at: SEND_AT + 2250 },
  { x: 1258, y: 589, at: SEND_AT + 2550 },
  { x: 604, y: 615, at: SEND_AT + 2900 },
];
const SPREAD = [
  { x: 1690, y: 420, rz: -7, ry: -14 },
  { x: 1770, y: 640, rz: 6, ry: -10 },
  { x: 1680, y: 860, rz: -3, ry: -16 },
];

/** The cited saves pop out of their citation numbers and pin to the window edge. */
function Ask({ t }: { t: number }) {
  const w = lift(t, opens("ask"), closes("ask"));
  return CITED.map((save, k) => {
    const from = CITES[k] ?? { x: 0, y: 0, at: 0 };
    if (t < from.at) return null;
    const to = SPREAD[k] ?? { ...from, rz: 0, ry: 0 };
    const width = 230;
    const height = clamp(width / save.aspect, 150, 230);
    const p = ease.outQuint(progress(t, from.at, 800));
    return (
      <Card
        key={save.id}
        id={save.id}
        pose={{
          x: mix(from.x, to.x, p),
          y: mix(from.y, to.y, p) - Math.sin(p * Math.PI) * 80,
          w: width,
          h: height,
          scale: mix(0.16, 1, p),
          rx: Math.sin(p * Math.PI) * 20,
          ry: to.ry * p,
          rz: to.rz * p,
          opacity: clamp(p * 4) * w.opacity,
          depth: p,
        }}
      />
    );
  });
}

/** Saves thrown out of the product windows, when a burst variant is on review. */
export function Burst({ t }: { t: number }) {
  if (is("burst-save")) return <Save t={t} />;
  if (is("burst-find")) return <Find t={t} />;
  if (is("burst-ask")) return <Ask t={t} />;
  return null;
}
