// Native macOS Liquid Glass controller.
//
// Drives the `@pond/native-glass` addon (an NSGlassEffectView inserted *below*
// the web contents, macOS 26+) from prefs. The web UI stays crisp and
// interactive on top; the desktop behind the window is refracted. No-op on
// other platforms / older macOS, where the addon reports unsupported.
import { createRequire } from "node:module";
import type { Prefs } from "@pond/schema/db";
import type { BrowserWindow } from "electron";
import log from "electron-log/main.js";

const require = createRequire(import.meta.url);

type NativeGlass = typeof import("@pond/native-glass");

/** A click-through glass overlay rect, in top-left CSS px (viewport space). */
export interface GlassRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  cornerRadius?: number;
  tintColor?: string;
  style?: "regular" | "clear";
  contentImage?: string;
}

let native: NativeGlass | null = null;
try {
  native = require("@pond/native-glass") as NativeGlass;
} catch (err) {
  log.warn("[pond glass] native addon unavailable", err);
}

let supported: boolean | null = null;

/** Whether native Liquid Glass is available (macOS 26+ with the addon built). */
export function isGlassSupported(): boolean {
  if (process.platform !== "darwin") return false;
  if (supported === null) {
    try {
      supported = native?.isSupported() ?? false;
    } catch {
      supported = false;
    }
    log.info("[pond glass] supported:", supported);
  }
  return supported;
}

/** Whether glass should currently be applied, given prefs. */
export function glassEnabled(prefs: Prefs | null): boolean {
  if (!isGlassSupported()) return false;
  // Default-on until prefs load so the first window paints glassy.
  if (!prefs) return true;
  if (prefs.preferences.reduceTransparency) return false;
  return prefs.preferences.liquidGlass !== false;
}

/**
 * Apply (or remove) the glass backing on `win` to match `prefs`. Safe to call
 * repeatedly; the addon updates the existing glass view in place.
 */
export function applyWindowGlass(
  win: BrowserWindow,
  prefs: Prefs | null,
): boolean {
  if (!native || process.platform !== "darwin" || win.isDestroyed())
    return false;
  const handle = win.getNativeWindowHandle();
  try {
    if (!glassEnabled(prefs)) {
      return native.removeWindowGlass(handle);
    }
    const style = prefs?.preferences.liquidGlassStyle ?? "regular";
    return native.setWindowGlass(handle, { style });
  } catch (err) {
    log.warn("[pond glass] apply failed", err);
    return false;
  }
}

/**
 * Replace the click-through glass overlay regions on `win`. The renderer pushes
 * element rects (top-left CSS px) it wants frosted; the addon flips them into
 * native coordinates and keeps them pinned across resizes. No-op unless glass is
 * both supported and enabled. An empty list clears the overlay.
 */
export function setGlassRegions(
  win: BrowserWindow,
  prefs: Prefs | null,
  regions: GlassRegion[],
): boolean {
  if (!native || process.platform !== "darwin" || win.isDestroyed())
    return false;
  const handle = win.getNativeWindowHandle();
  try {
    if (!glassEnabled(prefs) || regions.length === 0) {
      return native.clearGlassEffectRegions(handle);
    }
    const style = prefs?.preferences.liquidGlassStyle ?? "regular";
    return native.setGlassEffectRegions(
      handle,
      regions.map((region) => ({ style, ...region })),
    );
  } catch (err) {
    log.warn("[pond glass] regions failed", err);
    return false;
  }
}

/** Remove any click-through glass overlay regions from `win`. */
export function clearGlassRegions(win: BrowserWindow): boolean {
  if (!native || process.platform !== "darwin" || win.isDestroyed())
    return false;
  try {
    return native.clearGlassEffectRegions(win.getNativeWindowHandle());
  } catch (err) {
    log.warn("[pond glass] clear regions failed", err);
    return false;
  }
}
