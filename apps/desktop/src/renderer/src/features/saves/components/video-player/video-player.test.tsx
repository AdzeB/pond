import { PrefsSchema } from "@pond/schema";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ViewerHud } from "@/features/saves/components/viewers/hud";
import {
  ChromePortal,
  ViewerChrome,
} from "@/features/saves/components/viewers/media-viewer/chrome";
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
        renderToolbar={({ actions, edits }) => (
          <ChromePortal slot="top">
            <ViewerHud.Bar
              label="Video"
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
  const playbackToolbar = host.querySelector(
    '[role="toolbar"][aria-label="Playback"]',
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
  expect(playbackToolbar?.hasAttribute("data-chrome")).toBe(true);
  expect(host.querySelector('[aria-label="Loop Start in Seconds"]')).toBeNull();
  expect(host.querySelector('button[aria-label="Fill"]')).toBeNull();
  expect(host.querySelector('button[aria-label="Fit"]')).toBeNull();
  const mute = host.querySelector<HTMLButtonElement>(
    'button[aria-label="Mute"]',
  );
  const volume = host.querySelector('[aria-label="Video Volume"]');
  expect(volume).toBeNull();
  expect(host.querySelector("[data-video-volume-popover]")).toBeNull();
  expect(mute?.parentElement).toBe(playbackToolbar?.firstElementChild);
  const elapsedTime = host.querySelector('[aria-label="Elapsed time"]');
  const seek = host.querySelector('[aria-label="Seek"]');
  const duration = host.querySelector('[aria-label="Duration"]');
  if (!elapsedTime || !seek || !duration) {
    throw new Error("Missing video transport timing controls");
  }
  expect(elapsedTime.compareDocumentPosition(seek)).toBe(
    Node.DOCUMENT_POSITION_FOLLOWING,
  );
  expect(seek.compareDocumentPosition(duration)).toBe(
    Node.DOCUMENT_POSITION_FOLLOWING,
  );
  const video = host.querySelector("video");
  expect(video).toBeTruthy();
  await act(async () => mute?.click());
  expect(video?.muted).toBe(true);
  await act(async () => video?.dispatchEvent(new Event("volumechange")));
  expect(host.querySelector('button[aria-label="Unmute"]')).toBe(mute);
  expect(host.querySelector('button[aria-label="Back"]')).toBeNull();
  expect(host.querySelector('button[aria-label="Forward"]')).toBeNull();
  Object.defineProperty(video, "duration", {
    configurable: true,
    value: 60,
  });
  if (video) video.currentTime = 20;
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

it("always fits video inside the viewer", async () => {
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
  expect(video?.style.width).toBe("");
  expect(video?.style.height).toBe("");
  expect(video?.style.objectFit).toBe("contain");
  expect(host.querySelector('button[aria-label="Fill"]')).toBeNull();
  expect(host.querySelector('button[aria-label="Fit"]')).toBeNull();
});

it("toggles whole-video looping from the playback toolbar", async () => {
  await act(async () => {
    root.render(<TestVideoPlayer />);
  });
  const video = host.querySelector("video");
  const loop = host.querySelector<HTMLButtonElement>(
    'button[aria-label="Loop"]',
  );
  expect(video?.loop).toBe(false);
  expect(loop?.getAttribute("aria-pressed")).toBeNull();

  await act(async () => loop?.click());

  expect(video?.loop).toBe(true);
  expect(loop?.getAttribute("aria-pressed")).toBe("true");
});

it("lets the playback toolbar turn off automatic short-video looping", async () => {
  await act(async () => {
    root.render(<TestVideoPlayer />);
  });
  const video = host.querySelector("video");
  const loop = host.querySelector<HTMLButtonElement>(
    'button[aria-label="Loop"]',
  );
  Object.defineProperty(video, "duration", {
    configurable: true,
    value: 10,
  });
  await act(async () => {
    video?.dispatchEvent(new Event("durationchange"));
  });
  expect(video?.loop).toBe(true);
  expect(loop?.getAttribute("aria-pressed")).toBe("true");

  await act(async () => loop?.click());

  expect(video?.loop).toBe(false);
  expect(loop?.getAttribute("aria-pressed")).toBeNull();
});
