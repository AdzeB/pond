/** Beat timing for the launch video, in milliseconds. Every scene renders as a pure function of `t`. */

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

/** Matches the beats of the soundtrack in `apps/website/public/video/pond.mp4`. */
export const BEATS = {
  sea: [130, 3620],
  intro: [3650, 5480],
  tagline: [5830, 9000],
  ticker: [9480, 13220],
  save: [13520, 17570],
  sync: [17870, 24570],
  own: [24870, 28570],
  enrich: [28870, 33440],
  find: [33750, 38490],
  ask: [38780, 45780],
  connect: [46080, 51520],
  thesis: [52130, 55000],
  offer: [55610, 58040],
  end: [58740, 61000],
} as const satisfies Record<string, readonly [number, number]>;

export type BeatId = keyof typeof BEATS;
export const DURATION = BEATS.end[1];

/** Headline row for every product beat. */
export const HEAD_Y = 196;

/** How long each product verb holds at center before it docks and its window rises. */
export const HERO = {
  save: 1000,
  sync: 1000,
  own: 900,
  enrich: 1050,
  find: 950,
  ask: 900,
  connect: 1000,
} as const;

export type ProductBeat = keyof typeof HERO;

export const opens = (beat: ProductBeat) => BEATS[beat][0] + HERO[beat];
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

export type Key<V> = readonly [time: number, value: V];

/** Interpolates numeric records between keyframes with an easing per segment. */
export function keyframes<V extends Record<string, number>>(
  t: number,
  keys: readonly Key<V>[],
  curve: (p: number) => number = ease.inOut,
): V {
  const first = keys[0];
  if (!first) throw new Error("keyframes: empty");
  if (t <= first[0]) return first[1];
  for (let index = 1; index < keys.length; index++) {
    const [time, value] = keys[index] as Key<V>;
    const [previousTime, previous] = keys[index - 1] as Key<V>;
    if (t <= time) {
      const p = curve(progress(t, previousTime, time - previousTime));
      const out: Record<string, number> = {};
      for (const name of Object.keys(value)) {
        out[name] = mix(previous[name] as number, value[name] as number, p);
      }
      return out as V;
    }
  }
  return (keys[keys.length - 1] as Key<V>)[1];
}
