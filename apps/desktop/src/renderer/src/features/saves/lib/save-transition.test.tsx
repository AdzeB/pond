import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { act, useEffect, useLayoutEffect, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cardMedia,
  morphKeyframes,
  onTransitionMeasure,
  transitionSave,
  viewerMedia,
} from "./save-transition";

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

/** Resolves its hero size from an effect, the way the inspector fits after its first commit. */
function MeasuredViewer() {
  const [size, setSize] = useState(120);
  useLayoutEffect(() => onTransitionMeasure(() => setSize(480)), []);
  return (
    <section data-save-details="">
      <div data-save-hero="" data-part="viewer" data-size={size} />
    </section>
  );
}

function LateViewer() {
  const [size, setSize] = useState(120);
  useEffect(() => {
    const timer = window.setTimeout(() => setSize(480), 0);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <section data-save-details="">
      <div data-save-hero="" data-part="viewer" data-size={size} />
    </section>
  );
}

/** Mirrors the spec order: snapshot old names, run the update, snapshot new names, finish. */
function installViewTransitions() {
  const captures: string[][] = [];
  const sizes: number[][] = [];
  let finished: Promise<void> = Promise.resolve();
  const heroes = () =>
    [...document.querySelectorAll<HTMLElement>("[data-part]")].filter(
      (element) => element.style.viewTransitionName === "save-media",
    );
  const named = () => heroes().map((element) => element.dataset.part ?? "");
  const capture = () => {
    captures.push(named());
    sizes.push(
      heroes().map((element) => element.getBoundingClientRect().width),
    );
  };
  Object.defineProperty(document, "startViewTransition", {
    configurable: true,
    value: (update: () => Promise<void>) => {
      capture();
      const updateCallbackDone = Promise.resolve().then(update);
      finished = updateCallbackDone.then(capture);
      return {
        ready: finished,
        finished,
        updateCallbackDone,
        skipTransition: () => {},
      };
    },
  });
  return { captures, sizes, finished: () => finished, named };
}

describe("transitionSave", () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
      function (this: Element) {
        const size = Number(this.getAttribute("data-size") ?? 200);
        return new DOMRect(0, 0, size, size);
      },
    );
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    Reflect.deleteProperty(document, "startViewTransition");
    document.documentElement.removeAttribute("data-reduce-motion");
    vi.restoreAllMocks();
  });

  async function mount(path: string, viewer: typeof Viewer = Viewer) {
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
          component: viewer,
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

  it.each([
    ["a synchronous re-measure", MeasuredViewer],
    ["a layout change one task later", LateViewer],
  ])("captures the fitted hero after %s", async (_, viewer) => {
    const router = await mount("/", viewer);
    const transitions = installViewTransitions();
    /** act() holds default-priority renders until it exits; the browser scheduler does not. */
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", false);

    transitionSave({
      router,
      path: "/save/a",
      source: cardMedia("a"),
      target: viewerMedia,
    });
    await transitions.finished();
    vi.unstubAllGlobals();
    await act(async () => {});

    expect(transitions.captures).toEqual([["card"], ["viewer"]]);
    expect(transitions.sizes).toEqual([[200], [480]]);
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

describe("morphKeyframes", () => {
  it("lays the morph over the destination box with transforms only", () => {
    const frames = morphKeyframes(
      {
        easing: "ease",
        height: "200px",
        transform: "matrix(1, 0, 0, 1, 10, 20)",
        width: "100px",
      },
      {
        height: "400px",
        transform: "matrix(1, 0, 0, 1, 0, 0)",
        width: "400px",
      },
    );

    expect(frames).toEqual({
      group: [
        {
          easing: "ease",
          transform: "matrix(1, 0, 0, 1, 10, 20) scale(0.25, 0.5)",
        },
        { transform: "matrix(1, 0, 0, 1, 0, 0)" },
      ],
      old: [
        { easing: "ease", transform: "none" },
        { transform: "scale(1, 2)" },
      ],
      new: [
        { easing: "ease", transform: "scale(2, 1)" },
        { transform: "none" },
      ],
    });
  });

  it("leaves collapsed boxes to the default animation", () => {
    expect(
      morphKeyframes(
        { height: "0px", width: "100px" },
        { height: "400px", width: "400px" },
      ),
    ).toBeNull();
  });
});
