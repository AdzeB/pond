/**
 * Native macOS Liquid Glass (`NSGlassEffectView`) backing for Electron.
 *
 * A vendored, self-contained reimplementation of Electron PR #50415 so call
 * sites can migrate to `win.setGlassEffect` / `win.setGlassEffectRegions` once
 * the official API ships, then drop this package. Available on macOS 26+
 * ("Tahoe"/"Golden Gate"); every entry point is a no-op everywhere else.
 *
 * Two complementary surfaces:
 *
 * - **Window glass** ({@link setWindowGlass}) inserts one glass view *below* the
 *   web contents, so the desktop behind the window is refracted while the web
 *   UI stays crisp and fully interactive on top.
 * - **Region glass** ({@link setGlassEffectRegions}) places an
 *   `NSGlassEffectContainerView` *above* the web contents holding one glass view
 *   per rect. Both the container and its glass views are click-through
 *   (`-hitTest:` returns nil), so the overlay refracts whatever is behind it
 *   without intercepting mouse events.
 */

export interface WindowGlassOptions {
  /** Corner radius of the glass surface, in points. */
  cornerRadius?: number;
  /** Tint color as `#RGB`, `#RRGGBB`, or `#AARRGGBB` (Electron's alpha-first convention). */
  tintColor?: string;
  /** `regular` (default) frosts/refracts; `clear` is more transparent. */
  style?: "regular" | "clear";
}

export interface GlassRegion extends WindowGlassOptions {
  /** Left edge in CSS px, relative to the web viewport (top-left origin). */
  x: number;
  /** Top edge in CSS px, relative to the web viewport (top-left origin). */
  y: number;
  /** Width in CSS px. */
  width: number;
  /** Height in CSS px. */
  height: number;
  /**
   * Optional image rendered inside the glass's content view (proportionally
   * scaled down, centered, picking up the glass's vibrancy). Either encoded
   * image bytes (PNG/JPEG) as a Buffer, or a base64 / `data:` URL string.
   */
  contentImage?: Buffer | string;
}

/** Whether native Liquid Glass is available (macOS 26+ with the addon built). */
export function isSupported(): boolean;

/**
 * Insert an `NSGlassEffectView` behind the web contents of the window that owns
 * `handle` (from `BrowserWindow.getNativeWindowHandle()`). Idempotent — calling
 * again updates the existing glass view's options.
 */
export function setWindowGlass(
  handle: Buffer,
  options?: WindowGlassOptions,
): boolean;

/** Remove the window glass backing previously applied to the window owning `handle`. */
export function removeWindowGlass(handle: Buffer): boolean;

/**
 * Replace the click-through glass overlay regions on the window owning
 * `handle`. Rects are top-left CSS-px coordinates relative to the web viewport;
 * they are flipped into Cocoa's bottom-left space and re-flipped on resize.
 * Passing an empty array clears the overlay.
 */
export function setGlassEffectRegions(
  handle: Buffer,
  regions: GlassRegion[],
): boolean;

/** Remove the region glass overlay previously applied to the window owning `handle`. */
export function clearGlassEffectRegions(handle: Buffer): boolean;
