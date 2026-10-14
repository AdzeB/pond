/** The pointer over the app window during Find and Ask, in frame coordinates. */
import { ASK_AT, FILTER_AT, SEND_AT } from "./camera";
import { glide, pressing, type Waypoint } from "./cursor";
import { clamp, closes, opens } from "./timeline";

/** Measured from the app at the stage frame size. */
const SEARCH = { x: 380, y: 70 };
const COLOR = { x: 258, y: 114 };
const BROWN = { x: 361, y: 322 };
const COMPOSER = { x: 520, y: 470 };
const SEND = { x: 993, y: 512 };

const PATHS = [
  {
    from: opens("find"),
    to: closes("find"),
    presses: [FILTER_AT, FILTER_AT + 550],
    points: [
      { at: opens("find"), x: SEARCH.x + 90, y: SEARCH.y + 140 },
      { at: opens("find") + 650, ...SEARCH, move: 600 },
      { at: FILTER_AT - 60, ...COLOR, move: 800 },
      { at: FILTER_AT + 490, ...BROWN, move: 420 },
      { at: FILTER_AT + 1700, x: BROWN.x + 120, y: BROWN.y - 40, move: 600 },
    ],
  },
  {
    from: opens("ask"),
    to: closes("ask"),
    presses: [SEND_AT],
    points: [
      { at: opens("ask"), x: COMPOSER.x + 160, y: COMPOSER.y - 160 },
      { at: ASK_AT - 100, ...COMPOSER, move: 700 },
      { at: SEND_AT - 60, ...SEND, move: 550 },
      { at: SEND_AT + 900, x: SEND.x - 140, y: SEND.y - 90, move: 700 },
    ],
  },
] satisfies {
  from: number;
  to: number;
  presses: number[];
  points: Waypoint[];
}[];

export function pointer(t: number) {
  const path = PATHS.find(({ from, to }) => t >= from && t <= to + 400);
  if (!path) return null;
  return {
    ...glide(t, path.points),
    scale: pressing(t, path.presses) ? 0.86 : 1,
    opacity: clamp((t - path.from - 400) / 200),
  };
}
