/** Virtual time for frame-exact capture: timers, rAF, Date, and CSS animations only move when `advance` runs. */

interface Timer {
  id: number;
  at: number;
  fn: () => void;
  every: number | null;
}

export interface Clock {
  now(): number;
  advance(ms: number): void;
  freeze(): void;
  realFrame(): Promise<void>;
}

const EPOCH = Date.UTC(2026, 9, 12, 9, 41);
const realNow = performance.now.bind(performance);
const realRaf = window.requestAnimationFrame.bind(window);
const RealDate = Date;

let virtual = 0;
let nextId = 1;
let frozen = false;
const timers = new Map<number, Timer>();
let frames = new Map<number, FrameRequestCallback>();
const births = new WeakMap<Animation, number>();

function schedule(
  handler: TimerHandler,
  delay: number | undefined,
  every: boolean,
  args: unknown[],
) {
  const id = nextId++;
  const ms = Math.max(0, Number(delay) || 0);
  const fn = handler instanceof Function ? () => handler(...args) : () => {};
  timers.set(id, {
    id,
    at: virtual + ms,
    fn,
    every: every ? Math.max(1, ms) : null,
  });
  return id;
}

function syncAnimations(born: number) {
  for (const animation of document.getAnimations()) {
    let start = births.get(animation);
    if (start === undefined) {
      start = born;
      births.set(animation, start);
    }
    const end = Number(animation.effect?.getComputedTiming().endTime);
    const elapsed = (virtual - start) * animation.playbackRate;
    if (Number.isFinite(end) && elapsed >= end) {
      if (animation.playState !== "finished") animation.finish();
      continue;
    }
    if (animation.playState !== "paused") animation.pause();
    animation.currentTime = elapsed;
  }
}

function advance(ms: number) {
  const born = virtual;
  const target = virtual + Math.max(0, ms);
  for (;;) {
    let due: Timer | null = null;
    for (const timer of timers.values()) {
      if (timer.at <= target && (!due || timer.at < due.at)) due = timer;
    }
    if (!due) break;
    virtual = Math.max(virtual, due.at);
    if (due.every) due.at += due.every;
    else timers.delete(due.id);
    due.fn();
  }
  virtual = target;
  const callbacks = frames;
  frames = new Map();
  for (const callback of callbacks.values()) callback(virtual);
  syncAnimations(born);
}

class VirtualDate extends RealDate {
  constructor(...args: unknown[]) {
    if (args.length === 0) {
      super(EPOCH + virtual);
      return;
    }
    /** SAFETY: these are the caller's own `Date` arguments, forwarded unchanged. */
    super(...(args as [number]));
  }
  static override now() {
    return EPOCH + virtual;
  }
}

Object.assign(window, {
  Date: VirtualDate,
  setTimeout: (h: TimerHandler, d?: number, ...a: unknown[]) =>
    schedule(h, d, false, a),
  setInterval: (h: TimerHandler, d?: number, ...a: unknown[]) =>
    schedule(h, d, true, a),
  clearTimeout: (id?: number) => id !== undefined && timers.delete(id),
  clearInterval: (id?: number) => id !== undefined && timers.delete(id),
  requestAnimationFrame: (callback: FrameRequestCallback) => {
    const id = nextId++;
    frames.set(id, callback);
    return id;
  },
  cancelAnimationFrame: (id: number) => frames.delete(id),
});
performance.now = () => virtual;

let last = realNow();
function drive() {
  if (frozen) return;
  const now = realNow();
  advance(Math.min(now - last, 100));
  last = now;
  realRaf(drive);
}
realRaf(drive);

export const clock: Clock = {
  now: () => virtual,
  advance,
  freeze: () => {
    frozen = true;
  },
  realFrame: () => new Promise((resolve) => realRaf(() => resolve())),
};

Object.assign(window, { __clock: clock });
