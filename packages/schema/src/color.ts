import {
  CONTRAST_DEFAULT,
  CONTRAST_MAX,
  CONTRAST_MIN,
  type ThemeDef,
} from "./prefs";

export interface Oklch {
  l: number;
  c: number;
  h: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function parseHex(hex: string): [number, number, number] | null {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  const int = Number.parseInt(normalized.slice(1), 16);
  return [(int >> 16) & 0xff, (int >> 8) & 0xff, int & 0xff];
}

/** Normalize 3/6-digit hex, with or without "#", to lowercase `#rrggbb`; null if invalid. */
export function normalizeHex(input: string): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim().replace(/^#/, "");
  const expanded =
    trimmed.length === 3
      ? trimmed
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : trimmed;
  return /^[0-9a-f]{6}$/i.test(expanded) ? `#${expanded.toLowerCase()}` : null;
}

function srgbToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/**
 * sRGB hex to OKLCH.
 * @see https://bottosson.github.io/posts/oklab/
 */
export function hexToOklch(hex: string): Oklch | null {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  const r = srgbToLinear(rgb[0]);
  const g = srgbToLinear(rgb[1]);
  const b = srgbToLinear(rgb[2]);

  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  const okL = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const okA = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const okB = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  const c = Math.hypot(okA, okB);
  const h = c < 1e-4 ? 0 : ((Math.atan2(okB, okA) * 180) / Math.PI + 360) % 360;
  return { l: okL, c, h };
}

function round(value: number, places: number): number {
  const f = 10 ** places;
  return Math.round(value * f) / f;
}

/** Runtime inputs the CSS engine reads to derive the --ds-* scale; set on <html>. */
export interface ThemeEngineVars {
  baseL: number;
  baseC: number;
  baseH: number;
  accentL: number;
  accentC: number;
  accentH: number;
  /** CSS contrast multiplier (0.6..1.4) applied to the per-step lightness spread. */
  contrast: number;
  /** +1 when foreground is lighter than base (dark theme), -1 otherwise. */
  fgDir: 1 | -1;
  isDark: boolean;
}

const FALLBACK_BASE: Oklch = { l: 0.99, c: 0, h: 0 };
const FALLBACK_ACCENT: Oklch = { l: 0.62, c: 0.19, h: 250 };

/** Accent chroma multiplier applied only on Display P3 panels; mirrors the P3 tier baked into the theme package's static ramps. */
export const P3_CHROMA_BOOST = 1.4;

/** Maps the 0..100 contrast slider to the CSS lightness-spread multiplier. */
export function contrastMultiplier(contrast: number): number {
  const n = Number.isFinite(contrast) ? contrast : 30;
  const clamped = clamp(n, CONTRAST_MIN, CONTRAST_MAX);
  return round(0.6 + (clamped / 100) * 0.8, 4);
}

export function themeEngineVars(def: ThemeDef): ThemeEngineVars {
  const base = hexToOklch(def?.base ?? "") ?? FALLBACK_BASE;
  const accent = hexToOklch(def?.accent ?? "") ?? FALLBACK_ACCENT;
  /** Threshold above 0.5 so saturated mid colors still get white text. */
  const isDark = base.l < 0.6;
  return {
    baseL: round(base.l, 4),
    baseC: round(base.c, 4),
    baseH: round(base.h, 2),
    accentL: round(accent.l, 4),
    accentC: round(accent.c, 4),
    accentH: round(accent.h, 2),
    contrast: contrastMultiplier(def?.contrast ?? CONTRAST_DEFAULT),
    fgDir: isDark ? 1 : -1,
    isDark,
  };
}
