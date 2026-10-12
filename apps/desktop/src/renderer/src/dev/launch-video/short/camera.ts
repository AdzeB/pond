/** Camera crops for the short cut: which part of a surface fills the view at `t`. */
import { QUESTION } from "../constants";
import { glide, pressing, type Waypoint } from "../stage/cursor";
import { clamp, ease, mix, progress } from "../stage/timeline";
import { end, start } from "./timeline";

/** Where the real app sits on the stage, above the step caption. */
export const APP = { x: 320, y: 150, width: 1280, height: 740 } as const;

export interface Crop {
  x: number;
  y: number;
  width: number;
}

type Key = Crop & { at: number; move?: number };

/** Glides through crops, arriving at each by its `at`. */
export function track(t: number, keys: readonly Key[]): Crop {
  const first = keys[0];
  if (!first) throw new Error("camera: empty track");
  const crop = { x: first.x, y: first.y, width: first.width };
  for (const key of keys) {
    const move = key.move ?? 600;
    const k = ease.inOut(progress(t, key.at - move, move));
    crop.x = mix(crop.x, key.x, k);
    crop.y = mix(crop.y, key.y, k);
    crop.width = mix(crop.width, key.width, k);
  }
  return crop;
}

const PANEL = { x: 229, y: 45, width: 881 };
const SEARCH = { x: 380, y: 70 };
const COLOR = { x: 258, y: 114 };
const BROWN = { x: 361, y: 322 };

export const FIND = {
  type: start("find") + 350,
  filter: start("find") + 2600,
  exit: end("find") - 450,
};

export const ASK_STEP = 28;
const ASK_TYPE = start("ask") + 250;
const TYPED = ASK_TYPE + QUESTION.length * ASK_STEP;

export const ASK = {
  enter: start("ask") + 50,
  type: ASK_TYPE,
  send: TYPED + 280,
  exit: end("ask") - 350,
};

const FIND_KEYS: Key[] = [
  { at: start("find"), x: 238, y: 45, width: 380 },
  { at: FIND.type + 1350, x: 238, y: 45, width: 380, move: 1 },
  { at: FIND.type + 2050, ...PANEL, move: 700 },
  { at: FIND.filter - 50, x: 229, y: 45, width: 600, move: 600 },
  { at: FIND.filter + 1400, x: 229, y: 45, width: 600, move: 1 },
  { at: FIND.filter + 2000, ...PANEL, move: 650 },
];

const ASK_KEYS: Key[] = [
  { at: ASK.enter, x: 296, y: 294, width: 460 },
  { at: ASK.send + 100, x: 296, y: 294, width: 460, move: 1 },
  { at: ASK.send + 1050, x: 276, y: 110, width: 748, move: 950 },
];

/** The app crop for whichever beat is on, or null between them. */
export function appCrop(t: number): Crop | null {
  if (t >= start("find") && t < start("ask")) return track(t, FIND_KEYS);
  if (t >= start("ask") && t < end("ask")) return track(t, ASK_KEYS);
  return null;
}

const PATHS = [
  {
    from: FIND.type + 1600,
    to: FIND.exit,
    presses: [FIND.filter, FIND.filter + 550],
    points: [
      { at: FIND.type + 1600, x: SEARCH.x + 160, y: SEARCH.y + 200 },
      { at: FIND.filter - 60, ...COLOR, move: 750 },
      { at: FIND.filter + 490, ...BROWN, move: 420 },
      { at: FIND.filter + 1700, x: BROWN.x + 130, y: BROWN.y - 30, move: 600 },
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
