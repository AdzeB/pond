import { nativeTheme } from "electron";
import { getPrefs } from "./core/prefs";

export interface ResolvedTheme {
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
  background: string;
}

export async function resolveTheme(): Promise<ResolvedTheme | null> {
  try {
    const { resolveActiveTheme, themeCssVars } = await import(
      "@pond/schema/db"
    );
    const prefs = await getPrefs();
    const def = resolveActiveTheme(prefs, nativeTheme.shouldUseDarkColors);
    const v = themeCssVars(def);
    return {
      mode: v.isDark ? "dark" : "light",
      bgL: v.bgL,
      bgC: v.bgC,
      bgH: v.bgH,
      fgL: v.fgL,
      fgC: v.fgC,
      fgH: v.fgH,
      accentL: v.accentL,
      accentC: v.accentC,
      accentH: v.accentH,
      contrast: v.contrast,
      background: v.background,
    };
  } catch {
    return null;
  }
}
