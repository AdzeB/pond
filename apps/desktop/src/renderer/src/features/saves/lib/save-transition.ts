import type { AnyRouter } from "@tanstack/react-router";
import { flushSync } from "react-dom";

/** Must match the `::view-transition-*(save-media)` rules in the renderer stylesheet. */
const HERO_NAME = "save-media";
const ROUTE_TIMEOUT_MS = 500;
const PAINT_TIMEOUT_MS = 60;
const FIT_ATTEMPTS = 6;

interface SaveTransition {
  router: AnyRouter;
  path: string;
  source: HTMLElement | null;
  target: () => HTMLElement | null;
  stage?: () => HTMLElement | null;
  settle?: () => Promise<void>;
}

interface Box {
  width: number;
  height: number;
}

const measures = new Set<() => void>();

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
    `[data-library-card][data-save-id="${CSS.escape(id)}"] [data-save-thumb]`,
  );
  return viewport && thumb && intersects(thumb, viewport) ? thumb : null;
}

export function viewerMedia(): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    "[data-save-details] [data-save-hero]",
  );
}

export function viewerStage(): HTMLElement | null {
  return document.querySelector<HTMLElement>("[data-save-details]");
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

async function painted(element: HTMLElement): Promise<void> {
  const decodes = [
    ...element.querySelectorAll<HTMLImageElement>("img:not([data-pending])"),
  ]
    .filter((image) => !(image.complete && image.naturalWidth > 0))
    .map((image) => image.decode());
  if (decodes.length === 0) return;
  await Promise.race([
    Promise.any(decodes).catch(() => undefined),
    new Promise((resolve) => window.setTimeout(resolve, PAINT_TIMEOUT_MS)),
  ]);
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

function composite(): Animation[] {
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
  const frames = from && to ? morphKeyframes(from, to) : null;
  if (!frames) return [];
  effect.setKeyframes(frames.group);
  const { delay, duration } = effect.getTiming();
  return (["old", "new"] as const).map((part) => {
    const image = document.documentElement.animate(frames[part], {
      delay,
      duration,
      fill: "both",
      pseudoElement: `::view-transition-${part}(${HERO_NAME})`,
    });
    if (morph.startTime !== null) image.startTime = morph.startTime;
    return image;
  });
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
  stage,
  settle,
}: SaveTransition): void {
  if (!("startViewTransition" in document)) {
    router.history.push(path);
    void settle?.();
    return;
  }
  const from = reduceMotion() ? null : source;
  let to: HTMLElement | null = null;
  let parts: Animation[] = [];
  setHero(from, true);
  const transition = document.startViewTransition(async () => {
    setHero(from, false);
    await pushAndRender(router, path);
    await settle?.().catch(() => undefined);
    to = from ? target() : null;
    if (to) await fitted(to);
    const backdrop = to ? null : stage?.();
    if (backdrop) await painted(backdrop);
    setHero(to, true);
  });
  const clear = () => {
    setHero(from, false);
    setHero(to, false);
    for (const part of parts) part.cancel();
  };
  transition.ready.then(() => {
    if (to) parts = composite();
  }, clear);
  transition.finished.then(clear, clear);
}
