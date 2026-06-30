import {
  CUSTOM_THEME_DEFAULT,
  DEFAULT_PRESET_ID,
  type Prefs,
  type ThemeDef,
} from "./prefs";

export type ThemeAppearance = "light" | "dark";

export interface ThemePreset {
  id: string;
  name: string;
  appearance: ThemeAppearance;
  def: ThemeDef;
}

export const THEME_PRESETS: readonly ThemePreset[] = [
  {
    id: "light",
    name: "Light",
    appearance: "light",
    def: { base: "#ffffff", accent: "#3b82f6", contrast: 30 },
  },
  {
    id: "dark",
    name: "Dark",
    appearance: "dark",
    def: { base: "#2c2d30", accent: "#6e95ff", contrast: 30 },
  },
] as const;

const PRESETS_BY_ID = new Map(THEME_PRESETS.map((p) => [p.id, p]));

export function getPreset(id: string): ThemePreset | undefined {
  return PRESETS_BY_ID.get(id);
}

export function lightPresets(): ThemePreset[] {
  return THEME_PRESETS.filter((p) => p.appearance === "light");
}

export function darkPresets(): ThemePreset[] {
  return THEME_PRESETS.filter((p) => p.appearance === "dark");
}

function presetDef(id: string): ThemeDef {
  return (
    getPreset(id)?.def ??
    getPreset(DEFAULT_PRESET_ID)?.def ??
    CUSTOM_THEME_DEFAULT
  );
}

export function resolveActiveTheme(
  prefs: Prefs,
  systemPrefersDark: boolean,
): ThemeDef {
  const p = prefs.preferences;
  if (p.themeMode === "custom") return p.custom ?? CUSTOM_THEME_DEFAULT;
  if (p.themeMode === "system") {
    return presetDef(systemPrefersDark ? p.systemDarkId : p.systemLightId);
  }
  return presetDef(p.presetId);
}
