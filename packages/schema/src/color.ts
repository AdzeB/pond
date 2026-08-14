import {
  CONTRAST_DEFAULT,
  CONTRAST_MAX,
  CONTRAST_MIN,
  type ThemeDef,
} from "./prefs.types";

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

/** Runtime anchors the CSS scale reads; set on <html>. */
export interface ThemeCssVars {
  /** Exact surface / ink / accent hexes the CSS scale mixes from. */
  background: string;
  foreground: string;
  accent: string;
  bgL: number;
  bgC: number;
  bgH: number;
  fgL: number;
  fgC: number;
  fgH: number;
  accentL: number;
  accentC: number;
  accentH: number;
  /** CSS contrast multiplier (0.6..1.4) applied to mid gray mixes. */
  contrast: number;
  isDark: boolean;
}

const FALLBACK_BG: Oklch = { l: 1, c: 0, h: 0 };
const FALLBACK_FG: Oklch = { l: 0.25, c: 0, h: 0 };
const FALLBACK_ACCENT: Oklch = { l: 0.62, c: 0.19, h: 250 };

/** Accent chroma multiplier applied only on Display P3 panels; mirrors the P3 tier baked into the theme package's static ramps. */
export const P3_CHROMA_BOOST = 1.4;

/** Maps the 0..100 contrast slider to the CSS mid-spread multiplier. */
export function contrastMultiplier(contrast: number): number {
  const n = Number.isFinite(contrast) ? contrast : CONTRAST_DEFAULT;
  const clamped = clamp(n, CONTRAST_MIN, CONTRAST_MAX);
  return round(0.6 + (clamped / 100) * 0.8, 4);
}

function pack(ok: Oklch): Pick<Oklch, "l" | "c" | "h"> {
  return {
    l: round(ok.l, 4),
    c: round(ok.c, 4),
    h: round(ok.h, 2),
  };
}

export function themeCssVars(def: ThemeDef): ThemeCssVars {
  const background = normalizeHex(def?.background ?? "") ?? "#ffffff";
  const foreground = normalizeHex(def?.foreground ?? "") ?? "#1b1b1b";
  const accentHex = normalizeHex(def?.accent ?? "") ?? "#008fff";
  const bg = hexToOklch(background) ?? FALLBACK_BG;
  const fg = hexToOklch(foreground) ?? FALLBACK_FG;
  const accent = hexToOklch(accentHex) ?? FALLBACK_ACCENT;
  const bgPacked = pack(bg);
  const fgPacked = pack(fg);
  const accentPacked = pack(accent);
  return {
    background,
    foreground,
    accent: accentHex,
    bgL: bgPacked.l,
    bgC: bgPacked.c,
    bgH: bgPacked.h,
    fgL: fgPacked.l,
    fgC: fgPacked.c,
    fgH: fgPacked.h,
    accentL: accentPacked.l,
    accentC: accentPacked.c,
    accentH: accentPacked.h,
    contrast: contrastMultiplier(def?.contrast ?? CONTRAST_DEFAULT),
    isDark: bg.l < fg.l,
  };
}

/** @deprecated Use themeCssVars. */
export type ThemeEngineVars = ThemeCssVars & {
  baseL: number;
  baseC: number;
  baseH: number;
  fgDir: 1 | -1;
};

/** @deprecated Use themeCssVars. */
export function themeEngineVars(def: ThemeDef): ThemeEngineVars {
  const v = themeCssVars(def);
  return {
    ...v,
    baseL: v.bgL,
    baseC: v.bgC,
    baseH: v.bgH,
    fgDir: v.isDark ? 1 : -1,
  };
}
