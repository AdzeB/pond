import {
  buildThemeTokens,
  type Gamut,
  type ThemeInput,
  type ThemeMode,
} from "@pond/theme/tokens";

export function displayGamut(): Gamut {
  return window.matchMedia("(color-gamut: p3)").matches ? "p3" : "srgb";
}

export function paintTheme(input: ThemeInput, gamut: Gamut): ThemeMode {
  const { mode, tokens } = buildThemeTokens(input, gamut);
  const root = document.documentElement;
  for (const [name, value] of Object.entries(tokens)) {
    root.style.setProperty(name, value);
  }
  root.setAttribute("data-theme", mode);
  root.classList.toggle("dark", mode === "dark");
  root.classList.toggle("light", mode === "light");
  return mode;
}
