import type { AnyRouter } from "@tanstack/react-router";

/** Must match the `::view-transition-*(save-media)` rules in the renderer stylesheet. */
const HERO_NAME = "save-media";
const ROUTE_TIMEOUT_MS = 1000;
const PAINT_TIMEOUT_MS = 100;

interface SaveTransition {
  router: AnyRouter;
  path: string;
  source: HTMLElement | null;
  target: () => HTMLElement | null;
  settle?: () => Promise<void>;
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

function setHero(element: HTMLElement | null, on: boolean): void {
  if (element) element.style.viewTransitionName = on ? HERO_NAME : "";
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

async function painted(element: HTMLElement): Promise<void> {
  const decodes = [...element.querySelectorAll("img")].map((image) =>
    image.decode(),
  );
  await Promise.race([
    Promise.any(decodes).catch(() => undefined),
    new Promise((resolve) => window.setTimeout(resolve, PAINT_TIMEOUT_MS)),
  ]);
}

/**
 * Moves between the library and the viewer inside one view transition.
 * @remarks Rendering stays paused until the destination commits, so no empty frame paints.
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
  let to: HTMLElement | null = null;
  setHero(from, true);
  const transition = document.startViewTransition(async () => {
    setHero(from, false);
    await pushAndRender(router, path);
    await settle?.().catch(() => undefined);
    to = from ? target() : null;
    if (!to) return;
    setHero(to, true);
    await painted(to);
  });
  const clear = () => {
    setHero(from, false);
    setHero(to, false);
  };
  transition.ready.catch(() => undefined);
  transition.finished.then(clear, clear);
}
