import "../clock";
import "@/styles.css";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { clock } from "../clock";
import { ACTIONS, sortActions } from "./actions";
import { Composition } from "./composition";
import { director } from "./frames";
import { preload } from "./media";
import "./script";
import { DURATION, FPS } from "./timeline";

const host = document.getElementById("stage");
if (!host) throw new Error("#stage element missing");
const root = createRoot(host);
let current = 0;
let cursor = 0;

function render(t: number) {
  flushSync(() => root.render(<Composition t={t} />));
}

function advance(ms: number) {
  if (ms <= 0) return;
  clock.advance(ms);
  director()?.clock.advance(ms);
  current += ms;
}

Object.assign(window, {
  __stage: {
    duration: DURATION,
    fps: FPS,
    async ready(timeout = 20000) {
      const started = Date.now();
      while (Date.now() - started < timeout) {
        if (director()?.ready()) {
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
        director()?.clock.freeze();
      }
      while (cursor < ACTIONS.length && (ACTIONS[cursor]?.at ?? 0) <= t) {
        const action = ACTIONS[cursor++];
        if (!action) continue;
        advance(action.at - current);
        const target = director();
        if (target) action.run(target);
      }
      advance(t - current);
      render(t);
      await director()?.settled();
      await clock.realFrame();
      await clock.realFrame();
    },
  },
});

sortActions();
render(0);
