import type { AnyRouter } from "@tanstack/react-router";
import { useSyncExternalStore } from "react";
import { flushSync } from "react-dom";

/** Must match the `::view-transition-*(save-media)` rules in the renderer stylesheet. */
const HERO_NAME = "save-media";
const THUMB = "[data-save-thumb]";
const ROUTE_TIMEOUT_MS = 500;
const FIT_ATTEMPTS = 6;

interface SaveTransition {
  router: AnyRouter;
  path: string;
  source: HTMLElement | null;
  target: () => HTMLElement | null;
  settle?: () => Promise<void>;
}

interface Box {
  width: number;
  height: number;
}

interface Rect extends Box {
  left: number;
  top: number;
}

/** Where the media's full-aspect box sits, and the part of it that shows. */
export interface Frame {
  media: Rect;
  clip: Rect;
  radius: number;
}

interface Card {
  box: Rect;
  fit: "cover" | "contain";
  radius: number;
}

interface Grow {
  from: Frame;
  to: Frame;
  box: Box;
  contain: boolean;
}

const measures = new Set<() => void>();
const listeners = new Set<() => void>();
let running = 0;

/**
 * Registers a synchronous re-measure for fitted media.
 * @remarks ResizeObserver cannot fire while a view transition holds rendering, so the transition calls these before capture.
 */
export function onTransitionMeasure(measure: () => void): () => void {
  measures.add(measure);
  return () => {
    measures.delete(measure);
  };
}

function setRunning(delta: number): void {
  running += delta;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** False while a save transition runs, so viewer media can wait for the morph to land before fading in. */
export function useSaveTransitionSettled(): boolean {
  return useSyncExternalStore(subscribe, () => running === 0);
}

function reduceMotion(): boolean {
  return document.documentElement.getAttribute("data-reduce-motion") === "true";
}

function intersects(element: Element, viewport: Element): boolean {
  const a = element.getBoundingClientRect();
  const b = viewport.getBoundingClientRect();
  return (
    a.width > 0 &&
    a.height > 0 &&
    a.bottom > b.top &&
    a.top < b.bottom &&
    a.right > b.left &&
    a.left < b.right
  );
}

export function cardMedia(id: string): HTMLElement | null {
  const viewport = document.querySelector("[data-library-grid-viewport]");
  const thumb = viewport?.querySelector<HTMLElement>(
    `[data-library-card][data-save-id="${CSS.escape(id)}"] ${THUMB}`,
  );
  return viewport && thumb && intersects(thumb, viewport) ? thumb : null;
}

export function viewerMedia(): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    "[data-save-details] [data-save-hero]",
  );
}

function setHero(element: HTMLElement | null, on: boolean): void {
  if (element) element.style.viewTransitionName = on ? HERO_NAME : "";
}

function nextTask(): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}

async function pushAndRender(router: AnyRouter, path: string): Promise<void> {
  let unsubscribe = () => {};
  let timer = 0;
  try {
    await new Promise<void>((resolve) => {
      unsubscribe = router.subscribe("onResolved", () => resolve());
      timer = window.setTimeout(resolve, ROUTE_TIMEOUT_MS);
      router.history.push(path);
    });
  } finally {
    unsubscribe();
    window.clearTimeout(timer);
  }
}

/** Jumps running CSS transitions on the element and its ancestors to their end so the rect is the resting one. */
function settleTransitions(element: HTMLElement): void {
  for (
    let node: HTMLElement | null = element;
    node;
    node = node.parentElement
  ) {
    for (const animation of node.getAnimations?.() ?? []) {
      if (animation instanceof CSSTransition) animation.finish();
    }
  }
}

function hasBox(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

/**
 * Re-measures fitted media and settles CSS transitions in place, so the new capture is the resting geometry.
 * @remarks Yielding a task would queue the capture behind unrelated renders still settling from the selection click.
 */
async function fitted(element: HTMLElement): Promise<void> {
  for (let attempt = 0; attempt < FIT_ATTEMPTS; attempt += 1) {
    flushSync(() => {
      for (const measure of measures) measure();
    });
    settleTransitions(element);
    if (hasBox(element)) return;
    await nextTask();
  }
}

function rectOf(element: Element): Rect {
  const { left, top, width, height } = element.getBoundingClientRect();
  return { left, top, width, height };
}

function radiusOf(element: Element): number {
  return Number.parseFloat(getComputedStyle(element).borderTopLeftRadius) || 0;
}

function fit(box: Rect, aspect: number, mode: Card["fit"]): Rect {
  const wide = aspect > box.width / box.height;
  const width = wide === (mode === "cover") ? box.height * aspect : box.width;
  const height = width / aspect;
  return {
    left: box.left + (box.width - width) / 2,
    top: box.top + (box.height - height) / 2,
    width,
    height,
  };
}

function intersect(a: Rect, b: Rect): Rect {
  const left = Math.max(a.left, b.left);
  const top = Math.max(a.top, b.top);
  return {
    left,
    top,
    width: Math.min(a.left + a.width, b.left + b.width) - left,
    height: Math.min(a.top + a.height, b.top + b.height) - top,
  };
}

function thumbImage(thumb: HTMLElement): HTMLImageElement | null {
  return (
    [...thumb.querySelectorAll("img")].find(
      (image) => image.complete && image.naturalWidth > 0,
    ) ?? null
  );
}

/** Reads the card's crop; a card that rotates, flips or crops its thumbnail keeps the plain morph. */
function cardCrop(thumb: HTMLElement): Card | null {
  const style = getComputedStyle(thumb);
  const plain = (value: string) => !value || value === "none";
  if (!(plain(style.transform) && plain(style.clipPath))) return null;
  const image = thumbImage(thumb);
  return {
    box: rectOf(thumb),
    fit:
      image && getComputedStyle(image).objectFit === "contain"
        ? "contain"
        : "cover",
    radius: radiusOf(thumb),
  };
}

function cardFrame(card: Card, aspect: number): Frame {
  const media = fit(card.box, aspect, card.fit);
  return { media, clip: intersect(card.box, media), radius: card.radius };
}

function heroFrame(box: Rect, radius: number): Frame {
  return { media: box, clip: box, radius };
}

/**
 * Stands an uncropped copy of the card's thumbnail in for the card, so the open grows the whole image out of the card's crop.
 * @remarks Only the copy's clipping parent crops it on screen; the view transition captures the copy whole.
 */
function lift(
  thumb: HTMLElement,
  card: Card,
): { hero: HTMLElement; drop: () => void } | null {
  const image = thumbImage(thumb);
  if (!image || thumb.hasAttribute("data-sensitive")) return null;
  const { box } = card;
  const media = fit(box, image.naturalWidth / image.naturalHeight, card.fit);
  const clip = document.createElement("div");
  Object.assign(clip.style, {
    position: "fixed",
    left: `${box.left}px`,
    top: `${box.top}px`,
    width: `${box.width}px`,
    height: `${box.height}px`,
    overflow: "hidden",
    borderRadius: `${card.radius}px`,
    pointerEvents: "none",
  });
  const copy = document.createElement("img");
  copy.alt = "";
  copy.decoding = "sync";
  copy.src = image.currentSrc || image.src;
  Object.assign(copy.style, {
    position: "absolute",
    left: `${media.left - box.left}px`,
    top: `${media.top - box.top}px`,
    width: `${media.width}px`,
    height: `${media.height}px`,
    maxWidth: "none",
  });
  clip.append(copy);
  document.body.append(clip);
  thumb.style.visibility = "hidden";
  return {
    hero: copy,
    drop: () => {
      clip.remove();
      thumb.style.visibility = "";
    },
  };
}

function pose({ media, clip, radius }: Frame, box: Box): Keyframe {
  const x = media.width / box.width;
  const y = media.height / box.height;
  const top = (clip.top - media.top) / y;
  const right = (media.left + media.width - clip.left - clip.width) / x;
  const bottom = (media.top + media.height - clip.top - clip.height) / y;
  const left = (clip.left - media.left) / x;
  return {
    transform: `translate(${media.left}px, ${media.top}px) scale(${x}, ${y})`,
    clipPath: `inset(${top}px ${right}px ${bottom}px ${left}px round ${radius / x}px / ${radius / y}px)`,
  };
}

/**
 * Poses the hero group so the media's full-aspect box moves between its card crop and the viewer.
 * @remarks The group keeps the destination's layout size and only transforms, so Chromium can run it off the main thread.
 */
export function growKeyframes(
  from: Frame,
  to: Frame,
  box: Box,
  easing?: string,
): Keyframe[] {
  return [{ easing, ...pose(from, box) }, pose(to, box)];
}

function cover(aspect: number, box: Box): string {
  const boxAspect = box.width / box.height;
  return aspect > boxAspect
    ? `scale(${aspect / boxAspect}, 1)`
    : `scale(1, ${boxAspect / aspect})`;
}

function px(value: Keyframe[string]): number {
  return Number.parseFloat(String(value));
}

/**
 * Turns the hero group's size animation into transforms laid over the destination box.
 * @remarks Chromium animates view-transition group width and height on the main thread, which stutters while React commits.
 */
export function morphKeyframes(from: Keyframe, to: Keyframe) {
  const start = { width: px(from.width), height: px(from.height) };
  const end = { width: px(to.width), height: px(to.height) };
  const valid = [start.width, start.height, end.width, end.height].every(
    (value) => Number.isFinite(value) && value > 0,
  );
  if (!valid) return null;
  const easing = from.easing;
  return {
    group: [
      {
        easing,
        transform: `${from.transform ?? ""} scale(${start.width / end.width}, ${start.height / end.height})`,
      },
      { transform: String(to.transform ?? "none") },
    ],
    old: [
      { easing, transform: "none" },
      { transform: cover(start.width / start.height, end) },
    ],
    new: [
      { easing, transform: cover(end.width / end.height, start) },
      { transform: "none" },
    ],
  };
}

/** Reads the rect the view transition captured, which the snapshots match even if layout moved since. */
function capturedRect(frame: Keyframe): Rect | null {
  const width = px(frame.width);
  const height = px(frame.height);
  if (!(width > 0 && height > 0)) return null;
  const matrix = new DOMMatrixReadOnly(String(frame.transform ?? "none"));
  return { left: matrix.m41, top: matrix.m42, width, height };
}

function composite(plan: (from: Rect, to: Rect) => Grow | null): Animation[] {
  const group = `::view-transition-group(${HERO_NAME})`;
  const morph = document
    .getAnimations?.()
    .find(
      (animation) =>
        animation.effect instanceof KeyframeEffect &&
        animation.effect.pseudoElement === group,
    );
  const effect = morph?.effect;
  if (!(morph && effect instanceof KeyframeEffect)) return [];
  const [from, to] = effect.getKeyframes();
  if (!(from && to)) return [];
  const start = capturedRect(from);
  const end = capturedRect(to);
  const grow = start && end ? plan(start, end) : null;
  const { delay, duration } = effect.getTiming();
  const image = (part: "old" | "new", frames: Keyframe[]) => {
    const animation = document.documentElement.animate(frames, {
      delay,
      duration,
      fill: "both",
      pseudoElement: `::view-transition-${part}(${HERO_NAME})`,
    });
    if (morph.startTime !== null) animation.startTime = morph.startTime;
    return animation;
  };
  if (grow) {
    effect.setKeyframes(
      growKeyframes(grow.from, grow.to, grow.box, from.easing),
    );
    return grow.contain
      ? [image("old", [{ objectFit: "contain" }, { objectFit: "contain" }])]
      : [];
  }
  const frames = morphKeyframes(from, to);
  if (!frames) return [];
  effect.setKeyframes(frames.group);
  return [image("old", frames.old), image("new", frames.new)];
}

/** Grows open from a card, or shrinks closed into one, when the card's crop can be posed. */
function growFor(
  card: Card | null,
  lifted: boolean,
  sourceRadius: number,
  target: HTMLElement,
  from: Rect,
  to: Rect,
): Grow | null {
  if (lifted && card) {
    return {
      from: cardFrame(card, to.width / to.height),
      to: heroFrame(to, radiusOf(target)),
      box: to,
      contain: true,
    };
  }
  const crop = target.matches(THUMB) ? cardCrop(target) : null;
  if (card || !crop) return null;
  return {
    from: heroFrame(from, sourceRadius),
    to: cardFrame({ ...crop, box: to }, from.width / from.height),
    box: to,
    contain: false,
  };
}

/**
 * Moves between the library and the viewer inside one view transition.
 * @remarks Rendering stays paused until the destination commits and fits, so no empty or half-sized frame paints.
 */
export function transitionSave({
  router,
  path,
  source,
  target,
  settle,
}: SaveTransition): void {
  if (!("startViewTransition" in document)) {
    router.history.push(path);
    void settle?.();
    return;
  }
  const from = reduceMotion() ? null : source;
  const fromCard = from?.matches(THUMB) ? from : null;
  const card = fromCard ? cardCrop(fromCard) : null;
  const lifted = fromCard && card ? lift(fromCard, card) : null;
  const named = lifted?.hero ?? from;
  const sourceRadius = from && !fromCard ? radiusOf(from) : 0;
  for (const video of from?.querySelectorAll("video") ?? []) video.pause();
  let to: HTMLElement | null = null;
  let parts: Animation[] = [];
  setHero(named, true);
  setRunning(1);
  const transition = document.startViewTransition(async () => {
    setHero(named, false);
    lifted?.drop();
    await pushAndRender(router, path);
    await settle?.().catch(() => undefined);
    to = from ? target() : null;
    if (to) await fitted(to);
    setHero(to, true);
  });
  let done = false;
  const clear = () => {
    lifted?.drop();
    setHero(named, false);
    setHero(to, false);
    for (const part of parts) part.cancel();
    if (done) return;
    done = true;
    setRunning(-1);
  };
  transition.ready.then(() => {
    const target = to;
    if (target)
      parts = composite((start, end) =>
        growFor(card, !!lifted, sourceRadius, target, start, end),
      );
  }, clear);
  transition.finished.then(clear, clear);
}
