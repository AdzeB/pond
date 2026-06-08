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
    id: "pure-light",
    name: "Pure Light",
    appearance: "light",
    def: { base: "#ffffff", accent: "#3b82f6", contrast: 50 },
  },
  {
    id: "light",
    name: "Light",
    appearance: "light",
    def: { base: "#fcfcfd", accent: "#3b82f6", contrast: 30 },
  },
  {
    id: "foam",
    name: "Foam",
    appearance: "light",
    def: { base: "#eef5f7", accent: "#0ea5b7", contrast: 30 },
  },
  {
    id: "lagoon",
    name: "Lagoon",
    appearance: "light",
    def: { base: "#e7f3f0", accent: "#0d9488", contrast: 32 },
  },
  {
    id: "dark",
    name: "Dark",
    appearance: "dark",
    def: { base: "#111113", accent: "#6e95ff", contrast: 30 },
  },
  {
    id: "pure-dark",
    name: "Pure Dark",
    appearance: "dark",
    def: { base: "#000000", accent: "#6e95ff", contrast: 50 },
  },
  {
    id: "tide",
    name: "Tide",
    appearance: "dark",
    def: { base: "#0b1a24", accent: "#38bdf8", contrast: 34 },
  },
  {
    id: "marine",
    name: "Marine",
    appearance: "dark",
    def: { base: "#08191d", accent: "#2dd4bf", contrast: 34 },
  },
  {
    id: "abyss",
    name: "Abyss",
    appearance: "dark",
    def: { base: "#050912", accent: "#5b8cff", contrast: 42 },
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
