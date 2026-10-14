/** Camera moves for the Find and Ask beats: a stage push, a pointer follow, or a dimmed spotlight. */
import {
  ASK_AT,
  type Crop,
  FILTER_AT,
  SEND_AT,
  toStage,
  WINDOW,
} from "./camera";
import { pointer } from "./pointer";
import {
  clamp,
  closes,
  ease,
  HEIGHT,
  mix,
  opens,
  progress,
  WIDTH,
} from "./timeline";
import { is } from "./variant";

type Key<T> = T & { at: number; move?: number };

/** Glides through numeric keyframes, arriving at each by its `at`. */
function track<T extends Record<string, number>>(t: number, keys: Key<T>[]): T {
  const first = keys[0];
  if (!first) throw new Error("lens: empty track");
  const value = { ...first } as Record<string, number>;
  for (const key of keys) {
    const move = key.move ?? 500;
    const k = ease.inOut(progress(t, key.at - move, move));
    for (const name of Object.keys(value)) {
      value[name] = mix(
        value[name] ?? 0,
        (key as Record<string, number>)[name] ?? 0,
        k,
      );
    }
  }
  return value as T;
}

const PICKER = toStage(337, 300);
const COMPOSER = toStage(661, 440);
const ANSWER = toStage(660, 300);
const REST = { s: 1, x: WIDTH / 2, y: HEIGHT / 2 };

const PUSH: Key<typeof REST>[] = [
  { at: opens("find"), ...REST },
  { at: FILTER_AT - 120, s: 1.7, ...PICKER, move: 650 },
  { at: FILTER_AT + 1150, s: 1.7, ...PICKER, move: 1 },
  { at: FILTER_AT + 1800, ...REST, move: 650 },
  { at: ASK_AT + 700, ...REST, move: 1 },
  { at: ASK_AT + 1300, s: 1.65, ...COMPOSER, move: 600 },
  { at: SEND_AT + 200, s: 1.65, ...COMPOSER, move: 1 },
  { at: SEND_AT + 900, s: 1.3, ...ANSWER, move: 700 },
  { at: closes("ask") - 900, s: 1.3, ...ANSWER, move: 1 },
  { at: closes("ask") - 150, ...REST, move: 700 },
];

/** Whole-stage push: the view centre and zoom. */
export function push(t: number) {
  if (!is("camera-punch")) return null;
  const v = track(t, PUSH);
  const hx = WIDTH / 2 / v.s;
  return {
    s: v.s,
    x: clamp(v.x, hx, WIDTH - hx),
    y: v.y,
    /** How far in the push is, so overlays can step aside. */
    amount: clamp((v.s - 1) / 0.3),
  };
}

/** The pointer averaged over the last moments, so the follow camera trails it smoothly. */
function trailing(t: number) {
  let x = 0;
  let y = 0;
  let n = 0;
  for (let back = 0; back <= 480; back += 40) {
    const p = pointer(t - back);
    if (!p) continue;
    x += p.x;
    y += p.y;
    n++;
  }
  return n ? { x: x / n, y: y / n } : null;
}

type Hole = {
  x: number;
  y: number;
  w: number;
  h: number;
  dim: number;
  z: number;
};

const DIM = 0.24;
const OFF = { dim: 0, z: 1 };
const SEARCH_HOLE = { x: 232, y: 52, w: 708, h: 32 };
const PICKER_HOLE = { x: 232, y: 132, w: 209, h: 310 };
const COMPOSER_HOLE = { x: 301, y: 404, w: 720, h: 136 };
const ANSWER_HOLE = { x: 296, y: 198, w: 728, h: 196 };

const SPOT: Key<Hole>[] = [
  { at: opens("find"), ...SEARCH_HOLE, ...OFF },
  { at: opens("find") + 900, ...SEARCH_HOLE, dim: DIM, z: 1, move: 500 },
  { at: FILTER_AT - 200, ...SEARCH_HOLE, dim: DIM, z: 1, move: 1 },
  { at: FILTER_AT + 350, ...PICKER_HOLE, dim: DIM, z: 1.35, move: 550 },
  { at: FILTER_AT + 1200, ...PICKER_HOLE, dim: DIM, z: 1.35, move: 1 },
  { at: FILTER_AT + 1750, ...PICKER_HOLE, ...OFF, move: 500 },
  { at: ASK_AT - 300, ...COMPOSER_HOLE, ...OFF, move: 1 },
  { at: ASK_AT + 200, ...COMPOSER_HOLE, dim: DIM, z: 1, move: 500 },
  { at: SEND_AT + 250, ...COMPOSER_HOLE, dim: DIM, z: 1, move: 1 },
  { at: SEND_AT + 800, ...ANSWER_HOLE, dim: DIM, z: 1, move: 550 },
  { at: closes("ask") - 800, ...ANSWER_HOLE, dim: DIM, z: 1, move: 1 },
  { at: closes("ask") - 150, ...ANSWER_HOLE, ...OFF, move: 600 },
];

/** The dimmed backdrop's cut-out, in frame coordinates. */
export function spotlight(t: number) {
  if (!is("camera-spotlight")) return null;
  const hole = track(t, SPOT);
  return hole.dim > 0.005 ? hole : null;
}

/** In-window zoom: how far the crop narrows and which frame point it centres on. */
export function zoom(t: number) {
  if (is("camera-spotlight")) {
    const hole = track(t, SPOT);
    return { z: hole.z, x: hole.x + hole.w / 2, y: hole.y + hole.h / 2 };
  }
  if (!is("camera-follow")) return null;
  const focus = trailing(t);
  if (!focus) return null;
  const amount = Math.min(
    ...(["find", "ask"] as const).map((beat) =>
      t < opens(beat) - 100 || t > closes(beat) + 400
        ? 1
        : 1 -
          ease.inOut(progress(t, opens(beat) + 1100, 700)) *
            (1 - ease.inOut(progress(t, closes(beat) - 700, 600))),
    ),
  );
  return { z: mix(1.4, 1, amount), x: focus.x, y: focus.y };
}

/** Narrows the panel crop around a frame point, kept inside the panel. */
export function narrow(t: number, crop: Crop): Crop {
  const lens = zoom(t);
  if (!lens || lens.z <= 1.001) return crop;
  const width = crop.width / lens.z;
  const height = (width * WINDOW.height) / WINDOW.width;
  const full = (crop.width * WINDOW.height) / WINDOW.width;
  return {
    x: clamp(lens.x - width / 2, crop.x, crop.x + crop.width - width),
    y: clamp(lens.y - height / 2, crop.y, crop.y + full - height),
    width,
  };
}
