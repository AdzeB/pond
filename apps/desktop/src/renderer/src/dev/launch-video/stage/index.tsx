import "../clock";
import "@/styles.css";
import type { WirePrefsPatch } from "@shared/wire";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { clock } from "../clock";
import { ACTIONS, sortActions } from "./actions";
import { Composition } from "./composition";
import { director, type FrameId, frameWindow } from "./frames";
import { preload } from "./media";
import "./script";
import { DURATION, FPS } from "./timeline";

const FRAMES: readonly FrameId[] = ["app", "settings"];
const host = document.getElementById("stage");
if (!host) throw new Error("#stage element missing");
const root = createRoot(host);
let current = 0;
let cursor = 0;

function render(t: number) {
  flushSync(() => root.render(<Composition t={t} />));
}

function advanceAll(ms: number) {
  if (ms <= 0) return;
  clock.advance(ms);
  for (const id of FRAMES) director(id)?.clock.advance(ms);
  current += ms;
}

Object.assign(window, {
  __relayPrefs: (patch: WirePrefsPatch, from: Window) => {
    for (const id of FRAMES) {
      if (frameWindow(id) !== from) director(id)?.applyPrefs(patch);
    }
  },
  __stage: {
    duration: DURATION,
    fps: FPS,
    async ready(timeout = 20000) {
      const started = Date.now();
      while (Date.now() - started < timeout) {
        if (FRAMES.every((id) => director(id)) && director("app")?.ready()) {
          await document.fonts.ready;
          await preload();
          return true;
        }
        await clock.realFrame();
      }
      return false;
    },
    async seek(t: number) {
      if (current === 0 && cursor === 0) {
        clock.freeze();
        for (const id of FRAMES) director(id)?.clock.freeze();
      }
      while (cursor < ACTIONS.length && (ACTIONS[cursor]?.at ?? 0) <= t) {
        const action = ACTIONS[cursor++];
        if (!action) continue;
        advanceAll(action.at - current);
        const target = director(action.frame);
        if (target) action.run(target);
      }
      advanceAll(t - current);
      render(t);
      await Promise.all(FRAMES.map((id) => director(id)?.settled()));
      await clock.realFrame();
      await clock.realFrame();
    },
  },
});

sortActions();
render(0);
