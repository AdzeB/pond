import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cardMedia, transitionSave, viewerMedia } from "./save-transition";

function Grid() {
  return (
    <div data-library-grid-viewport="">
      <div data-library-card="" data-save-id="a">
        <div data-save-thumb="" data-part="card" />
      </div>
    </div>
  );
}

function Viewer() {
  return (
    <section data-save-details="">
      <div data-save-hero="" data-part="viewer" />
    </section>
  );
}

/** Mirrors the spec order: snapshot old names, run the update, snapshot new names, finish. */
function installViewTransitions() {
  const captures: string[][] = [];
  let finished: Promise<void> = Promise.resolve();
  const named = () =>
    [...document.querySelectorAll<HTMLElement>("[data-part]")]
      .filter((element) => element.style.viewTransitionName === "save-media")
      .map((element) => element.dataset.part ?? "");
  Object.defineProperty(document, "startViewTransition", {
    configurable: true,
    value: (update: () => Promise<void>) => {
      captures.push(named());
      const updateCallbackDone = Promise.resolve().then(update);
      finished = updateCallbackDone.then(() => {
        captures.push(named());
      });
      return {
        ready: finished,
        finished,
        updateCallbackDone,
        skipTransition: () => {},
      };
    },
  });
  return { captures, finished: () => finished, named };
}

describe("transitionSave", () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 200, 200),
    );
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    Reflect.deleteProperty(document, "startViewTransition");
    document.documentElement.removeAttribute("data-reduce-motion");
    vi.restoreAllMocks();
  });

  async function mount(path: string) {
    const rootRoute = createRootRoute({ component: Outlet });
    const router = createRouter({
      routeTree: rootRoute.addChildren([
        createRoute({
          getParentRoute: () => rootRoute,
          path: "/",
          component: Grid,
        }),
        createRoute({
          getParentRoute: () => rootRoute,
          path: "/save/$id",
          component: Viewer,
        }),
      ]),
      history: createMemoryHistory({ initialEntries: [path] }),
    });
    await act(async () => {
      await router.load();
      root.render(<RouterProvider router={router} />);
    });
    return router;
  }

  it("grows the card into the viewer once the save route renders", async () => {
    const router = await mount("/");
    const transitions = installViewTransitions();

    await act(async () => {
      transitionSave({
        router,
        path: "/save/a",
        source: cardMedia("a"),
        target: viewerMedia,
      });
      await transitions.finished();
    });

    expect(transitions.captures).toEqual([["card"], ["viewer"]]);
    expect(router.state.location.pathname).toBe("/save/a");
    expect(transitions.named()).toEqual([]);
  });

  it("shrinks the viewer back into its revealed card", async () => {
    const router = await mount("/save/a");
    const transitions = installViewTransitions();
    const order: string[] = [];

    await act(async () => {
      transitionSave({
        router,
        path: "/",
        source: viewerMedia(),
        target: () => {
          order.push(`target ${router.state.location.pathname}`);
          return cardMedia("a");
        },
        settle: async () => {
          order.push("reveal");
        },
      });
      await transitions.finished();
    });

    expect(transitions.captures).toEqual([["viewer"], ["card"]]);
    expect(order).toEqual(["reveal", "target /"]);
  });

  it("swaps without a morph when motion is reduced", async () => {
    document.documentElement.setAttribute("data-reduce-motion", "true");
    const router = await mount("/");
    const transitions = installViewTransitions();

    await act(async () => {
      transitionSave({
        router,
        path: "/save/a",
        source: cardMedia("a"),
        target: viewerMedia,
      });
      await transitions.finished();
    });

    expect(transitions.captures).toEqual([[], []]);
    expect(router.state.location.pathname).toBe("/save/a");
  });

  it("navigates directly when view transitions are unavailable", async () => {
    const router = await mount("/save/a");
    const settle = vi.fn(async () => {});

    transitionSave({
      router,
      path: "/",
      source: viewerMedia(),
      target: () => cardMedia("a"),
      settle,
    });

    expect(router.history.location.pathname).toBe("/");
    expect(settle).toHaveBeenCalledOnce();
    await act(async () => {});
  });
});
