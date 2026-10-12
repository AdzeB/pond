/** Beat timing for the launch video, in milliseconds. Every scene renders as a pure function of `t`. */

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

/** Matches the beats of the soundtrack in `apps/website/public/video/pond.mp4`. */
export const BEATS = {
  sea: [130, 3620],
  intro: [3650, 5780],
  save: [5830, 10180],
  sync: [10180, 17180],
  own: [17180, 21180],
  enrich: [21180, 26060],
  find: [26060, 31090],
  ask: [31090, 38390],
  connect: [38390, 44360],
  thesis: [44440, 47810],
  offer: [47920, 50810],
  end: [51050, 53310],
} as const satisfies Record<string, readonly [number, number]>;

export type BeatId = keyof typeof BEATS;
export const DURATION = BEATS.end[1];

/** Headline row for every product beat. */
export const HEAD_Y = 196;

/** When each product window starts rising, after its beat begins. */
const OPEN = {
  save: 770,
  own: 600,
  enrich: 750,
  find: 720,
  ask: 670,
  connect: 670,
} as const;

export type ProductBeat = keyof typeof OPEN | "sync";

/** How long each product verb holds at center before it docks. Ask and Connect reveal in place. */
export const HERO: Partial<Record<ProductBeat, number>> = {
  save: 830,
  sync: 800,
  own: 800,
  enrich: 850,
  find: 780,
};

export const opens = (beat: keyof typeof OPEN) => BEATS[beat][0] + OPEN[beat];
export const closes = (beat: BeatId) => BEATS[beat][1] - 350;

export const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

export const mix = (from: number, to: number, amount: number) =>
  from + (to - from) * amount;

export const ease = {
  out: (p: number) => 1 - (1 - p) ** 3,
  outQuint: (p: number) => 1 - (1 - p) ** 5,
  in: (p: number) => p ** 3,
  inOut: (p: number) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2),
};

/** 0 → 1 across `[start, start + duration]`. */
export const progress = (t: number, start: number, duration: number) =>
  duration <= 0 ? (t >= start ? 1 : 0) : clamp((t - start) / duration);

export interface Envelope {
  opacity: number;
  dy: number;
  blur: number;
}

/** The shared in/out: rise and unblur over `duration`, then sink and blur away from `exit`. */
export function envelope(
  t: number,
  enter: number,
  exit: number,
  { duration = 700, rise = 16, out = 350 } = {},
): Envelope {
  const a = ease.outQuint(progress(t, enter, duration));
  const b = ease.in(progress(t, exit, out));
  return {
    opacity: a * (1 - b),
    dy: (1 - a) * rise - b * rise * 0.6,
    blur: (1 - a) * 8 + b * 8,
  };
}

/** CSS for an envelope plus any extra transform. */
export function styled(e: Envelope, transform = "") {
  return {
    opacity: e.opacity,
    transform: `${transform} translateY(${e.dy}px)`.trim(),
    filter: e.blur > 0.05 ? `blur(${e.blur}px)` : undefined,
    visibility: e.opacity <= 0.002 ? ("hidden" as const) : undefined,
  };
}

/** A window rising into place under the headline, then sinking out with blur. */
export function lift(t: number, enter: number, exit: number) {
  const up = ease.outQuint(progress(t, enter, 1100));
  const out = ease.in(progress(t, exit, 350));
  const opacity = t < enter || t > exit + 400 ? 0 : clamp(up * 3) * (1 - out);
  return {
    opacity,
    dy: (1 - up) * 500 + out * 40,
    blur: out * 8,
  };
}
