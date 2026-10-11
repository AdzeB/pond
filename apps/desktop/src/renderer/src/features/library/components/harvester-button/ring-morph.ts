import { LOGO_PATH, LOGO_VIEW_BOX } from "@pond/ui";

export interface Point {
  x: number;
  y: number;
}

export const MARK_CENTER = LOGO_VIEW_BOX / 2;
const RING_OUTER_RADIUS = 92;
export const RING_THICKNESS = 30;
export const RING_RADIUS = RING_OUTER_RADIUS - RING_THICKNESS / 2;

const OUTER_SAMPLES = 160;
const INNER_SAMPLES = 80;
const CURVE_STEPS = 16;

const [OUTER_PATH = "", INNER_PATH = ""] = LOGO_PATH.split(/(?=M)/);

let markLoops: { outer: Point[]; inner: Point[] } | null = null;

export function easeInOutCubic(x: number): number {
  const t = Math.min(1, Math.max(0, x));
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/** Pulls each point along its own angle toward a circle, so `mark` 1 is the source loop and 0 is the circle. */
export function morphLoop(
  points: readonly Point[],
  radius: number,
  mark: number,
): string {
  const commands = points.map((point, index) => {
    const theta = Math.atan2(point.y - MARK_CENTER, point.x - MARK_CENTER);
    const x =
      point.x * mark + (MARK_CENTER + Math.cos(theta) * radius) * (1 - mark);
    const y =
      point.y * mark + (MARK_CENTER + Math.sin(theta) * radius) * (1 - mark);
    return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
  });
  return `${commands.join("")}Z`;
}

function cubic(a: number, b: number, c: number, d: number, t: number): number {
  const u = 1 - t;
  return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
}

/** Flattens one closed subpath made of absolute M, L, H, V, and C commands. */
function flattenPath(d: string): Point[] {
  const tokens = d.match(/[MLHVCZ]|-?(?:\d+\.?\d*|\.\d+)/g) ?? [];
  const points: Point[] = [];
  let cursor: Point = { x: 0, y: 0 };
  let command = "";
  let index = 0;
  const read = () => Number(tokens[index++]);
  while (index < tokens.length) {
    const token = tokens[index] ?? "";
    if (/[MLHVCZ]/.test(token)) {
      command = token;
      index += 1;
      if (command === "Z") break;
      continue;
    }
    if (command === "C") {
      const c1 = { x: read(), y: read() };
      const c2 = { x: read(), y: read() };
      const end = { x: read(), y: read() };
      for (let step = 1; step <= CURVE_STEPS; step += 1) {
        const t = step / CURVE_STEPS;
        points.push({
          x: cubic(cursor.x, c1.x, c2.x, end.x, t),
          y: cubic(cursor.y, c1.y, c2.y, end.y, t),
        });
      }
      cursor = end;
      continue;
    }
    if (command === "H") cursor = { x: read(), y: cursor.y };
    else if (command === "V") cursor = { x: cursor.x, y: read() };
    else cursor = { x: read(), y: read() };
    points.push(cursor);
  }
  return points;
}

/** Resamples a closed subpath into `count` points spaced evenly by length. */
export function samplePath(d: string, count: number): Point[] {
  const outline = flattenPath(d);
  const first = outline[0];
  if (!first) return [];
  const closed = [...outline, first];
  const lengths = [0];
  for (let i = 1; i < closed.length; i += 1) {
    const a = closed[i - 1] ?? first;
    const b = closed[i] ?? first;
    lengths.push((lengths[i - 1] ?? 0) + Math.hypot(b.x - a.x, b.y - a.y));
  }
  const total = lengths.at(-1) ?? 0;
  const samples: Point[] = [];
  let segment = 1;
  for (let i = 0; i < count; i += 1) {
    const target = (i / count) * total;
    while (segment < closed.length - 1 && (lengths[segment] ?? 0) < target) {
      segment += 1;
    }
    const a = closed[segment - 1] ?? first;
    const b = closed[segment] ?? first;
    const start = lengths[segment - 1] ?? 0;
    const span = (lengths[segment] ?? start) - start;
    const t = span > 0 ? (target - start) / span : 0;
    samples.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  return samples;
}

export function ringMorphPath(mark: number): string {
  markLoops ??= {
    outer: samplePath(OUTER_PATH, OUTER_SAMPLES),
    inner: samplePath(INNER_PATH, INNER_SAMPLES),
  };
  return (
    morphLoop(markLoops.outer, RING_OUTER_RADIUS, mark) +
    morphLoop(markLoops.inner, RING_OUTER_RADIUS - RING_THICKNESS, mark)
  );
}
