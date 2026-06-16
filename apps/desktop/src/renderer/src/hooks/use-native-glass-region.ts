import { type RefObject, useEffect, useId } from "react";
import type { GlassRegionWire } from "../../../preload";

// Renderer-side registry for native macOS Liquid Glass overlay regions.
//
// The main process (`glass.setGlassEffectRegions`) replaces *all* regions on
// each call, so every component that wants a frosted region registers into this
// shared map keyed by a stable id. Updates are coalesced into a single rAF
// flush and pushed as the combined set, so multiple `useNativeGlassRegion`
// callers compose instead of clobbering one another.
const regions = new Map<string, GlassRegionWire>();
let flushScheduled = false;

function scheduleFlush(): void {
  if (flushScheduled) return;
  flushScheduled = true;
  requestAnimationFrame(() => {
    flushScheduled = false;
    void window.pond?.glassSetRegions?.([...regions.values()]);
  });
}

export interface NativeGlassRegionOptions {
  /** Corner radius of the glass surface, in points. */
  cornerRadius?: number;
  /** Tint color as `#RGB`, `#RRGGBB`, or `#AARRGGBB`. */
  tintColor?: string;
  /** `regular` (default) frosts/refracts; `clear` is more transparent. */
  style?: "regular" | "clear";
  /** Optional image rendered inside the glass (base64 / `data:` URL). */
  contentImage?: string;
  /** Set false to temporarily disable the region without unmounting. */
  enabled?: boolean;
}

/**
 * Frost the element behind `ref` with a click-through native Liquid Glass
 * overlay that tracks its position/size across layout, scroll, and resize.
 * No-op unless the OS supports it (macOS 26+) and glass is enabled in prefs.
 *
 * The overlay sits *above* the web contents and refracts whatever is behind it,
 * so it's best on decorative, non-text surfaces — interactive controls beneath
 * stay clickable (events fall through) but appear blurred.
 */
export function useNativeGlassRegion(
  ref: RefObject<HTMLElement | null>,
  options: NativeGlassRegionOptions = {},
): void {
  const id = useId();
  const {
    cornerRadius,
    tintColor,
    style,
    contentImage,
    enabled = true,
  } = options;
  const supported =
    typeof window !== "undefined" &&
    window.__pondShell?.glassSupported === true;

  useEffect(() => {
    const el = ref.current;
    if (!supported || !enabled || !el) {
      if (regions.delete(id)) scheduleFlush();
      return;
    }

    const measure = () => {
      const node = ref.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        if (regions.delete(id)) scheduleFlush();
        return;
      }
      regions.set(id, {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
        cornerRadius,
        tintColor,
        style,
        contentImage,
      });
      scheduleFlush();
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener("resize", measure);
    // Capture phase so nested scroll containers also trigger a remeasure.
    window.addEventListener("scroll", measure, true);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      if (regions.delete(id)) scheduleFlush();
    };
  }, [
    id,
    ref,
    supported,
    enabled,
    cornerRadius,
    tintColor,
    style,
    contentImage,
  ]);
}
