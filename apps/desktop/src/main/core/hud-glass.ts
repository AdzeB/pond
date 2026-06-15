import type { BrowserWindow } from "electron";
import log from "electron-log/main.js";

// Minimal structural view of the `electron-liquid-glass` default export. We keep
// our own interface so a version bump can't break the build, and so the module
// can be loaded entirely defensively.
interface GlassInstance {
  isGlassSupported(): boolean;
  addView(
    handle: Buffer,
    options?: { cornerRadius?: number; tintColor?: string; opaque?: boolean },
  ): number;
}

let instance: GlassInstance | null | undefined;
let loading: Promise<GlassInstance | null> | null = null;

function isMac(): boolean {
  return process.platform === "darwin";
}

// Lazily import the native binding. A missing or ABI-incompatible binary must
// never crash the main process — on any failure we resolve to null and the HUD
// silently falls back to its CSS look.
export async function loadHudGlass(): Promise<GlassInstance | null> {
  if (instance !== undefined) return instance;
  if (loading) return loading;
  if (!isMac()) {
    instance = null;
    return instance;
  }
  loading = (async () => {
    try {
      const ns = (await import("electron-liquid-glass")) as {
        default?: GlassInstance;
      };
      instance = ns.default ?? null;
    } catch (err) {
      log.warn("[pond hud] liquid glass native module unavailable", err);
      instance = null;
    }
    return instance;
  })();
  return loading;
}

const applied = new WeakSet<BrowserWindow>();

// Wraps the window's content area with an NSGlassEffectView (capsule when
// cornerRadius == height / 2). The view sits behind the web contents, so the
// translucent pill on top tints the live desktop showing through the glass.
export function applyHudGlass(
  win: BrowserWindow,
  cornerRadius: number,
): boolean {
  if (!instance) return false;
  if (applied.has(win)) return true;
  try {
    const id = instance.addView(win.getNativeWindowHandle(), {
      cornerRadius,
      opaque: false,
    });
    if (id < 0) return false;
    applied.add(win);
    return true;
  } catch (err) {
    log.warn("[pond hud] applyHudGlass failed", err);
    return false;
  }
}

export function forgetHudGlass(win: BrowserWindow): void {
  applied.delete(win);
}
