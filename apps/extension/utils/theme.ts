/** Mirrors the desktop renderer's boot script: the whole --ds-* palette derives from these engine vars. */
import { storage } from "wxt/utils/storage";

export interface ThemeVars {
  mode: "light" | "dark";
  baseL: number;
  baseC: number;
  baseH: number;
  accentL: number;
  accentC: number;
  accentH: number;
  contrast: number;
  fgDir: number;
}

const cached = storage.defineItem<ThemeVars | null>("local:theme");

const VAR_PROPS = [
  ["baseL", "--ds-base-l"],
  ["baseC", "--ds-base-c"],
  ["baseH", "--ds-base-h"],
  ["accentL", "--ds-accent-l"],
  ["accentC", "--ds-accent-c"],
  ["accentH", "--ds-accent-h"],
  ["contrast", "--ds-contrast"],
  ["fgDir", "--ds-fg-dir"],
] as const;

export function applyTheme(theme: ThemeVars | null): void {
  const doc = document.documentElement;
  if (!theme) {
    doc.removeAttribute("data-theme");
    doc.style.removeProperty("color-scheme");
    for (const [, prop] of VAR_PROPS) doc.style.removeProperty(prop);
    return;
  }
  doc.setAttribute("data-theme", theme.mode);
  /** Overrides the stylesheet's `light dark` so light-dark() tones follow the app, not the browser. */
  doc.style.setProperty("color-scheme", theme.mode);
  for (const [key, prop] of VAR_PROPS) {
    if (typeof theme[key] === "number") {
      doc.style.setProperty(prop, String(theme[key]));
    }
  }
}

export async function applyCachedTheme(): Promise<void> {
  try {
    const theme = await cached.getValue();
    if (theme) applyTheme(theme);
  } catch {
    /* Vite gallery/localhost has no extension storage. */
  }
}

export async function rememberTheme(
  theme: ThemeVars | null | undefined,
): Promise<void> {
  if (!theme) return;
  applyTheme(theme);
  try {
    await cached.setValue(theme);
  } catch {
    /* Vite gallery/localhost has no extension storage. */
  }
}
