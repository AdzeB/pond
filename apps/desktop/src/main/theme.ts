/** Resolves theme prefs into the engine numbers shared by the shell boot hint and the local HTTP API. */
import { nativeTheme } from "electron";
import { getPrefs } from "./core/prefs";

export interface ResolvedTheme {
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

export async function resolveTheme(): Promise<ResolvedTheme | null> {
  try {
    const { resolveActiveTheme, themeEngineVars } = await import(
      "@pond/schema/db"
    );
    const prefs = await getPrefs();
    const def = resolveActiveTheme(prefs, nativeTheme.shouldUseDarkColors);
    const v = themeEngineVars(def);
    return {
      mode: v.isDark ? "dark" : "light",
      baseL: v.baseL,
      baseC: v.baseC,
      baseH: v.baseH,
      accentL: v.accentL,
      accentC: v.accentC,
      accentH: v.accentH,
      contrast: v.contrast,
      fgDir: v.fgDir,
    };
  } catch {
    return null;
  }
}
