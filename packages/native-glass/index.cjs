"use strict";

// Loads the compiled native addon when present (macOS, built against the
// current Electron ABI) and otherwise exposes inert no-ops, so callers never
// have to branch on platform or build state.

/**
 * @typedef {object} NativeGlass
 * @property {() => boolean} isSupported
 * @property {(handle: Buffer, options?: object) => boolean} setWindowGlass
 * @property {(handle: Buffer) => boolean} removeWindowGlass
 * @property {(handle: Buffer, regions: object[]) => boolean} setGlassEffectRegions
 * @property {(handle: Buffer) => boolean} clearGlassEffectRegions
 */

/** @type {NativeGlass | null} */
let impl;

try {
  // Built by node-gyp into build/Release (see scripts/rebuild-native.mjs).
  impl = require("./build/Release/pond_glass.node");
} catch {
  impl = null;
}

/** @type {NativeGlass} */
const noop = {
  isSupported() {
    return false;
  },
  setWindowGlass() {
    return false;
  },
  removeWindowGlass() {
    return false;
  },
  setGlassEffectRegions() {
    return false;
  },
  clearGlassEffectRegions() {
    return false;
  },
};

const native = impl ?? noop;

module.exports = {
  /** Whether native Liquid Glass is available (macOS 26+ with the addon built). */
  isSupported() {
    try {
      return native.isSupported();
    } catch {
      return false;
    }
  },
  /**
   * Insert an NSGlassEffectView behind the web contents of the window that owns
   * `handle` (from `BrowserWindow.getNativeWindowHandle()`). Idempotent.
   * @param {Buffer} handle
   * @param {{ cornerRadius?: number, tintColor?: string, style?: "regular" | "clear" }} [options]
   * @returns {boolean} true if applied
   */
  setWindowGlass(handle, options) {
    try {
      return native.setWindowGlass(handle, options ?? {});
    } catch {
      return false;
    }
  },
  /**
   * Remove the glass backing previously applied to the window owning `handle`.
   * @param {Buffer} handle
   * @returns {boolean} true if a glass view was removed
   */
  removeWindowGlass(handle) {
    try {
      return native.removeWindowGlass(handle);
    } catch {
      return false;
    }
  },
  /**
   * Replace the click-through glass overlay regions on the window owning
   * `handle`. Each region is a top-left CSS-px rect relative to the web
   * viewport; the regions are flipped into native coordinates and kept pinned
   * across window resizes. Passing an empty array clears the overlay.
   * @param {Buffer} handle
   * @param {Array<{ x: number, y: number, width: number, height: number, cornerRadius?: number, tintColor?: string, style?: "regular" | "clear", contentImage?: Buffer | string }>} regions
   * @returns {boolean} true if applied
   */
  setGlassEffectRegions(handle, regions) {
    try {
      return native.setGlassEffectRegions(handle, regions ?? []);
    } catch {
      return false;
    }
  },
  /**
   * Remove the region glass overlay previously applied to the window owning
   * `handle`.
   * @param {Buffer} handle
   * @returns {boolean} true if an overlay was removed
   */
  clearGlassEffectRegions(handle) {
    try {
      return native.clearGlassEffectRegions(handle);
    } catch {
      return false;
    }
  },
};
