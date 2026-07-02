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
    def: { base: "#ffffff", accent: "#008FFF", contrast: 30 },
  },
  {
    id: "paper",
    name: "Paper",
    appearance: "light",
    def: { base: "#FCFBF8", accent: "#E8590C", contrast: 30 },
  },
  {
    id: "mint",
    name: "Mint",
    appearance: "light",
    def: { base: "#F5FBF8", accent: "#0CA678", contrast: 30 },
  },
  {
    id: "rose",
    name: "Rose",
    appearance: "light",
    def: { base: "#ffffff", accent: "#E64980", contrast: 30 },
  },
  {
    id: "grape",
    name: "Grape",
    appearance: "light",
    def: { base: "#ffffff", accent: "#7C5CFF", contrast: 30 },
  },
  {
    id: "dark",
    name: "Dark",
    appearance: "dark",
    def: { base: "#0A0A0A", accent: "#008FFF", contrast: 30 },
  },
  {
    id: "midnight",
    name: "Midnight",
    appearance: "dark",
    def: { base: "#0B0F1A", accent: "#4C8DFF", contrast: 30 },
  },
  {
    id: "forest",
    name: "Forest",
    appearance: "dark",
    def: { base: "#0A0F0C", accent: "#2FB380", contrast: 30 },
  },
  {
    id: "plum",
    name: "Plum",
    appearance: "dark",
    def: { base: "#100A16", accent: "#A17CFF", contrast: 30 },
  },
  {
    id: "ember",
    name: "Ember",
    appearance: "dark",
    def: { base: "#140D0A", accent: "#FF8A3D", contrast: 30 },
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
