/** Mirrors the desktop renderer's boot script: the whole --ds-* palette derives from these anchors. */
import { storage } from "wxt/utils/storage";

export interface ThemeVars {
  mode: "light" | "dark";
  bgL: number;
  bgC: number;
  bgH: number;
  fgL: number;
  fgC: number;
  fgH: number;
  accentL: number;
  accentC: number;
  accentH: number;
  contrast: number;
  background?: string;
}

const cached = storage.defineItem<ThemeVars | null>("local:theme");

const VAR_PROPS = [
  ["bgL", "--ds-bg-l"],
  ["bgC", "--ds-bg-c"],
  ["bgH", "--ds-bg-h"],
  ["fgL", "--ds-fg-l"],
  ["fgC", "--ds-fg-c"],
  ["fgH", "--ds-fg-h"],
  ["accentL", "--ds-accent-l"],
  ["accentC", "--ds-accent-c"],
  ["accentH", "--ds-accent-h"],
  ["contrast", "--ds-contrast"],
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
