"use client";

import {
  createHoverGate,
  SOUND_PATCH,
  type UiSoundName,
} from "@pond/ui/sounds";
import { ensureReady } from "@web-kits/audio";
import { useEffect } from "react";

const CONTROL = "a[href], button";
const RATE_MS = 40;
const RAPID_MS = 110;

/** Download buttons carry `data-variant`; the quieter text links do not. */
function cueFor(control: Element): UiSoundName {
  return control.hasAttribute("data-variant") ? "tap" : "soft";
}

export function Sounds() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const hover = createHoverGate();
    let last = 0;
    let unlocked = false;

    const onPointerDown = (event: PointerEvent) => {
      unlocked = true;
      if (event.button !== 0 || reduce.matches) return;
      if (!(event.target instanceof Element)) return;
      const control = event.target.closest(CONTROL);
      if (!control) return;

      const now = performance.now();
      if (now - last < RATE_MS) return;
      const volume = now - last < RAPID_MS ? 0.7 : 1;
      last = now;

      const name = cueFor(control);
      const detune = (Math.random() - 0.5) * 28;
      void ensureReady()
        .then(() => SOUND_PATCH.play(name, { detune, volume }))
        .catch(() => {});
    };

    const onKeyDown = () => {
      unlocked = true;
    };

    /** Browsers hold audio until a gesture; a queued hover would fire late on the first click. */
    const onPointerOver = (event: PointerEvent) => {
      if (!unlocked || reduce.matches || !fine.matches) return;
      if (event.pointerType !== "mouse") return;
      if (!(event.target instanceof Element)) return;
      const control = event.target.closest(CONTROL);
      if (!control || !hover.enter(control, event.timeStamp)) return;
      const detune = (Math.random() - 0.5) * 28;
      void ensureReady()
        .then(() => SOUND_PATCH.play("hover", { detune }))
        .catch(() => {});
    };

    const onPointerOut = (event: PointerEvent) => {
      if (!(event.target instanceof Element)) return;
      const control = event.target.closest(CONTROL);
      const next =
        event.relatedTarget instanceof Element ? event.relatedTarget : null;
      if (control) hover.leave(control, next);
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("pointerover", onPointerOver);
    document.addEventListener("pointerout", onPointerOut);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("pointerover", onPointerOver);
      document.removeEventListener("pointerout", onPointerOut);
    };
  }, []);

  return null;
}
