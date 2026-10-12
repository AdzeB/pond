/** Camera crops for the short cut: which part of a surface fills the view at `t`. */
import { QUESTION } from "../constants";
import { glide, pressing, type Waypoint } from "../stage/cursor";
import { FRAME } from "../stage/frames";
import { clamp, ease, mix, progress } from "../stage/timeline";
import type { Hole } from "./spotlight";
import { end, start } from "./timeline";

/** The whole app window on the stage, at 1.2 times its frame size. */
export const APP = {
  x: (1920 - FRAME.width * 1.2) / 2,
  y: (1080 - FRAME.height * 1.2) / 2,
  width: FRAME.width * 1.2,
  height: FRAME.height * 1.2,
} as const;

export interface Crop {
  x: number;
  y: number;
  width: number;
}

type Key<T> = T & { at: number; move?: number };

/** Glides through numeric keyframes, arriving at each by its `at`. */
export function track<T extends object>(t: number, keys: readonly Key<T>[]): T {
  const first = keys[0];
  if (!first) throw new Error("camera: empty track");
  const value: Record<string, number> = {
    ...(first as Record<string, number>),
  };
  for (const key of keys) {
    const k = ease.inOut(
      progress(t, key.at - (key.move ?? 600), key.move ?? 600),
    );
    for (const name of Object.keys(value)) {
      if (name === "at" || name === "move") continue;
      value[name] = mix(
        value[name] ?? 0,
        (key as Record<string, number>)[name] ?? 0,
        k,
      );
    }
  }
  return value as T;
}

const WHOLE = { x: 0, y: 0, width: FRAME.width };
const SEARCH = { x: 380, y: 70 };
const COLOR = { x: 258, y: 114 };
const BROWN = { x: 361, y: 322 };
const SEND = { x: 993, y: 512 };

export const FIND = {
  type: start("find") + 400,
  filter: start("find") + 2000,
  exit: end("find") - 350,
};

export const ASK_STEP = 24;
const ASK_TYPE = start("ask") + 300;

export const ASK = {
  type: ASK_TYPE,
  send: ASK_TYPE + QUESTION.length * ASK_STEP + 300,
  exit: end("ask") - 350,
};

const PICKER = { x: 0, y: 83, width: 753 };
const ANSWER = { x: 270, y: 51, width: 780 };

const FIND_KEYS: Key<Crop>[] = [
  { at: start("find"), ...WHOLE },
  { at: FIND.filter - 50, ...WHOLE, move: 1 },
  { at: FIND.filter + 450, ...PICKER, move: 650 },
  { at: FIND.filter + 1250, ...PICKER, move: 1 },
  { at: FIND.filter + 1900, ...WHOLE, move: 650 },
];

const ASK_KEYS: Key<Crop>[] = [
  { at: start("ask"), ...WHOLE },
  { at: ASK.send + 1500, ...WHOLE, move: 1 },
  { at: ASK.send + 2300, ...ANSWER, move: 800 },
];

/** The app crop for whichever beat is on, or null between them. */
export function appCrop(t: number): Crop | null {
  if (t >= start("find") && t < start("ask")) return track(t, FIND_KEYS);
  if (t >= start("ask") && t < end("ask")) return track(t, ASK_KEYS);
  return null;
}

const POPOVER: Hole = { x: 226, y: 96, width: 222, height: 352 };
const REPLY: Hole = { x: 290, y: 105, width: 740, height: 290 };

/** The dimmed backdrop around whatever the beat is pointing at, in frame coordinates. */
export function appSpotlight(t: number): { hole: Hole; amount: number } | null {
  if (t >= start("find") && t < start("ask")) {
    const amount =
      ease.inOut(progress(t, FIND.filter + 100, 350)) *
      (1 - ease.inOut(progress(t, FIND.filter + 1250, 400)));
    return { hole: POPOVER, amount };
  }
  if (t >= start("ask") && t < end("ask")) {
    return {
      hole: REPLY,
      amount: ease.inOut(progress(t, ASK.send + 1600, 500)),
    };
  }
  return null;
}

const PATHS = [
  {
    from: FIND.type + 1000,
    to: FIND.exit,
    presses: [FIND.filter, FIND.filter + 550],
    points: [
      { at: FIND.type + 1000, x: SEARCH.x + 160, y: SEARCH.y + 220 },
      { at: FIND.filter - 60, ...COLOR, move: 700 },
      { at: FIND.filter + 490, ...BROWN, move: 420 },
      { at: FIND.filter + 1700, x: BROWN.x + 160, y: BROWN.y + 40, move: 600 },
    ],
  },
  {
    from: ASK.send - 800,
    to: ASK.exit,
    presses: [ASK.send],
    points: [
      { at: ASK.send - 800, x: SEND.x - 220, y: SEND.y - 150 },
      { at: ASK.send - 60, ...SEND, move: 650 },
      { at: ASK.send + 900, x: SEND.x - 120, y: SEND.y + 20, move: 700 },
    ],
  },
] satisfies {
  from: number;
  to: number;
  presses: number[];
  points: Waypoint[];
}[];

/** The pointer over the app, in frame coordinates. */
export function appPointer(t: number) {
  const path = PATHS.find(({ from, to }) => t >= from && t <= to + 300);
  if (!path) return null;
  return {
    ...glide(t, path.points),
    scale: pressing(t, path.presses) ? 0.86 : 1,
    opacity: clamp((t - path.from) / 200),
  };
}
