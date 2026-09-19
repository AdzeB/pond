import { PrefsSchema } from "@pond/schema";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { VideoPlayer } from "./";

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("pond", {
    query: async (name: string) => {
      if (name === "saves.mediaTiming") return { frameRate: 24 };
      return PrefsSchema.parse({});
    },
    tx: async () => ({ ok: true }),
  });
  Object.defineProperty(HTMLMediaElement.prototype, "play", {
    configurable: true,
    value: () => Promise.resolve(),
  });
  Object.defineProperty(HTMLMediaElement.prototype, "pause", {
    configurable: true,
    value: () => {},
  });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

it("places playback controls in the bottom toolbar", async () => {
  await act(async () => {
    root.render(<VideoPlayer src="pond://test/clip.mp4" active />);
  });
  const loop = [...host.querySelectorAll("button")].find(
    (button) => button.getAttribute("aria-label") === "Loop",
  );
  expect(loop).toBeTruthy();
  expect(loop?.closest("[data-slot]")?.getAttribute("data-slot")).toBe(
    "bottom",
  );
  expect(host.querySelector("[data-anchor]")).toBeNull();
});
