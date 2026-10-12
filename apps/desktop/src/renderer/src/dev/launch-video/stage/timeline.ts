/** Beat timing for the launch video, in milliseconds. Every scene renders as a pure function of `t`. */

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

export const BEATS = {
  hook: [0, 3200],
  intro: [3200, 5600],
  from: [5600, 8800],
  save: [8800, 13800],
  sync: [13800, 19000],
  own: [19000, 23000],
  enrich: [23000, 28000],
  find: [28000, 34000],
  ask: [34000, 40000],
  theme: [40000, 44500],
  connect: [44500, 49500],
  layer: [49500, 53000],
  try: [53000, 56500],
  outro: [56500, 61000],
} as const satisfies Record<string, readonly [number, number]>;

export type BeatId = keyof typeof BEATS;
export const DURATION = BEATS.outro[1];

export const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

export const mix = (from: number, to: number, amount: number) =>
  from + (to - from) * amount;

export const ease = {
  linear: (p: number) => p,
  out: (p: number) => 1 - (1 - p) ** 3,
  in: (p: number) => p ** 3,
  inOut: (p: number) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2),
  /** Critically damped settle, close to the site's `--spring-land`. */
  settle: (p: number) => (p >= 1 ? 1 : 1 - (1 + 8 * p) * Math.exp(-8 * p)),
};

/** 0 → 1 across `[start, start + duration]`. */
export const progress = (t: number, start: number, duration: number) =>
  duration <= 0 ? (t >= start ? 1 : 0) : clamp((t - start) / duration);

/** Fade-in after the beat starts and fade-out before it ends. */
export function presence(
  t: number,
  beat: BeatId,
  fadeIn = 360,
  fadeOut = 320,
): number {
  const [start, end] = BEATS[beat];
  return (
    ease.out(progress(t, start, fadeIn)) *
    (1 - ease.in(progress(t, end - fadeOut, fadeOut)))
  );
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
