import { buildThemeTokens } from "@pond/theme/tokens";
import type { ThemeVars } from "./theme";

/** Paints the open Library's theme, or follows the system appearance when Pond hasn't shared one. */
export function paintTheme(target: HTMLElement, theme: ThemeVars | null): void {
  if (!theme) {
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    target.setAttribute("data-theme", dark ? "dark" : "light");
    target.style.colorScheme = dark ? "dark" : "light";
    return;
  }
  const gamut = window.matchMedia("(color-gamut: p3)").matches ? "p3" : "srgb";
  const { mode, tokens } = buildThemeTokens(theme, gamut);
  for (const [name, value] of Object.entries(tokens)) {
    target.style.setProperty(name, value);
  }
  target.setAttribute("data-theme", mode);
  target.style.colorScheme = mode;
}
