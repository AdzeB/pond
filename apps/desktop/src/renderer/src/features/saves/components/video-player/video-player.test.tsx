import { PrefsSchema } from "@pond/schema";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ViewerHud } from "@/features/saves/components/viewers/hud";
import {
  ChromePortal,
  ViewerChrome,
} from "@/features/saves/components/viewers/media-viewer/chrome/chrome";
import { ViewerToolbarGroups } from "@/features/saves/components/viewers/viewer-toolbar-groups";
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

function TestVideoPlayer() {
  return (
    <ViewerChrome>
      <VideoPlayer
        src="pond://test/clip.mp4"
        active
        renderToolbar={({ actions, edits, view }) => (
          <ChromePortal slot="top">
            <ViewerHud.Bar
              label="Video"
              center={view}
              end={<ViewerToolbarGroups actions={actions} edits={edits} />}
            />
          </ChromePortal>
        )}
      />
    </ViewerChrome>
  );
}

it("composes one top video toolbar and one bottom playback toolbar", async () => {
  await act(async () => {
    root.render(<TestVideoPlayer />);
  });
  const rotate = [...host.querySelectorAll("button")].find(
    (button) => button.getAttribute("aria-label") === "Rotate Video",
  );
  const loop = [...host.querySelectorAll("button")].find(
    (button) => button.getAttribute("aria-label") === "Loop",
  );
  const actionToolbar = host.querySelector(
    '[role="toolbar"][aria-label="Video"]',
  );
  expect(
    host.querySelectorAll('[data-slot="top"] [role="toolbar"]'),
  ).toHaveLength(1);
  expect(
    host.querySelectorAll('[data-slot="top"] [role="separator"]'),
  ).toHaveLength(0);
  expect(actionToolbar?.children).toHaveLength(3);
  expect(rotate).toBeTruthy();
  expect(rotate?.closest("[data-slot]")?.getAttribute("data-slot")).toBe("top");
  expect(loop).toBeTruthy();
  expect(loop?.closest("[data-slot]")?.getAttribute("data-slot")).toBe(
    "bottom",
  );
  const fill = host.querySelector<HTMLButtonElement>(
    'button[aria-label="Fill"]',
  );
  const fit = host.querySelector<HTMLButtonElement>('button[aria-label="Fit"]');
  expect(fill).not.toBeNull();
  expect(fit).not.toBeNull();
  expect(fill?.getAttribute("aria-pressed")).toBeNull();
  expect(fit?.getAttribute("aria-pressed")).toBe("true");
  const mute = host.querySelector<HTMLButtonElement>(
    'button[aria-label="Mute"]',
  );
  const volume = host.querySelector('[aria-label="Video Volume"]');
  expect(volume).not.toBeNull();
  expect(volume?.closest("[data-video-volume-control]")).toBe(
    mute?.parentElement,
  );
  expect(volume?.parentElement?.hasAttribute("data-video-volume-popover")).toBe(
    true,
  );
  const video = host.querySelector("video");
  const back = host.querySelector<HTMLButtonElement>(
    'button[aria-label="Back"]',
  );
  const forward = host.querySelector<HTMLButtonElement>(
    'button[aria-label="Forward"]',
  );
  expect(video).toBeTruthy();
  expect(back).toBeTruthy();
  expect(forward).toBeTruthy();
  Object.defineProperty(video, "duration", {
    configurable: true,
    value: 60,
  });
  if (video) video.currentTime = 20;
  await act(async () => back?.click());
  expect(video?.currentTime).toBe(10);
  await act(async () => forward?.click());
  expect(video?.currentTime).toBe(20);
  await act(async () => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "ArrowLeft",
        shiftKey: true,
        bubbles: true,
      }),
    );
  });
  expect(video?.currentTime).toBe(10);
  await act(async () => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "ArrowRight",
        shiftKey: true,
        bubbles: true,
      }),
    );
  });
  expect(video?.currentTime).toBe(20);
  expect(host.querySelector('button[aria-label="Previous Frame"]')).toBeNull();
  expect(host.querySelector('button[aria-label="Next Frame"]')).toBeNull();
  expect(host.querySelector("[data-anchor]")).toBeNull();
});

it("switches between Fill and Fit video sizing", async () => {
  await act(async () => {
    root.render(<TestVideoPlayer />);
  });
  const video = host.querySelector("video");
  expect(video).not.toBeNull();
  Object.defineProperties(video, {
    duration: { configurable: true, value: 60 },
    videoWidth: { configurable: true, value: 1920 },
    videoHeight: { configurable: true, value: 1080 },
  });
  await act(async () => {
    video?.dispatchEvent(new Event("loadedmetadata"));
  });
  const fill = host.querySelector<HTMLButtonElement>(
    'button[aria-label="Fill"]',
  );
  const fit = host.querySelector<HTMLButtonElement>('button[aria-label="Fit"]');
  expect(fill?.disabled).toBe(false);
  await act(async () => fill?.click());
  expect(video?.style.width).toBe("100%");
  expect(video?.style.height).toBe("100%");
  expect(video?.style.objectFit).toBe("cover");
  expect(video?.style.transform).toContain("scale(1)");
  expect(fill?.getAttribute("aria-pressed")).toBe("true");
  expect(fit?.getAttribute("aria-pressed")).toBeNull();
  await act(async () => fit?.click());
  expect(video?.style.width).toBe("");
  expect(video?.style.height).toBe("");
  expect(video?.style.objectFit).toBe("contain");
  expect(fill?.getAttribute("aria-pressed")).toBeNull();
  expect(fit?.getAttribute("aria-pressed")).toBe("true");
});
