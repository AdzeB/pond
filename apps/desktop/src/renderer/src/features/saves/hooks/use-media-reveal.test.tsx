import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from "@tanstack/react-router";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it } from "vitest";
import { transitionSave } from "@/features/saves/lib/save-transition";
import { useMediaReveal } from "./use-media-reveal";

let host: HTMLDivElement;
let root: Root;
let release = () => {};
let finished = Promise.resolve();
const seen: boolean[] = [];

function Probe({ ready }: { ready: boolean }) {
  seen.push(useMediaReveal(ready, "clip.mp4"));
  return null;
}

beforeEach(() => {
  seen.length = 0;
  host = document.createElement("div");
  root = createRoot(host);
  Object.defineProperty(document, "startViewTransition", {
    configurable: true,
    value: (update: () => Promise<void>) => {
      finished = new Promise<void>((resolve) => {
        release = resolve;
      }).then(update);
      return {
        ready: finished,
        finished,
        updateCallbackDone: finished,
        skipTransition: () => {},
      };
    },
  });
});

afterEach(async () => {
  await act(async () => root.unmount());
  Reflect.deleteProperty(document, "startViewTransition");
});

async function startTransition() {
  const router = createRouter({
    routeTree: createRootRoute(),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  await act(async () => {
    transitionSave({
      router,
      path: "/save/a",
      source: null,
      target: () => null,
    });
  });
}

async function land() {
  await act(async () => {
    release();
    await finished;
  });
}

it("holds ready media until the save transition lands", async () => {
  await act(async () => root.render(<Probe ready={false} />));
  await startTransition();
  await act(async () => root.render(<Probe ready />));

  expect(seen.at(-1)).toBe(false);

  await land();

  expect(seen.at(-1)).toBe(true);
});

it("keeps shown media visible through a later transition", async () => {
  await act(async () => root.render(<Probe ready />));
  await startTransition();

  expect(seen.at(-1)).toBe(true);

  await land();
});
