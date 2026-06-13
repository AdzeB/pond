import {
  CONTRAST_MAX,
  CONTRAST_MIN,
  CUSTOM_THEME_DEFAULT,
  DEFAULT_PREFS,
  darkPresets,
  getPreset,
  lightPresets,
  type Prefs,
  type ThemeDef,
} from "@pond/schema/db";
import { ColorField, RangeField, Settings } from "@pond/ui";
import type { Binding } from "@/components/settings-engine";
import { PresetSelect, ThemeSelect } from "@/components/settings-theme";

const DEFAULTS = DEFAULT_PREFS.preferences;

function presetDefById(id: string): ThemeDef {
  return getPreset(id)?.def ?? CUSTOM_THEME_DEFAULT;
}

type ThemePrefs = Prefs["preferences"];

function readTheme(binding: Binding) {
  const values = binding.values as Partial<ThemePrefs>;
  const patch = binding.patch as (delta: Partial<ThemePrefs>) => void;
  return {
    patch,
    mode: values.themeMode ?? DEFAULTS.themeMode,
    presetId: values.presetId ?? DEFAULTS.presetId,
    systemLightId: values.systemLightId ?? DEFAULTS.systemLightId,
    systemDarkId: values.systemDarkId ?? DEFAULTS.systemDarkId,
    custom: values.custom ?? CUSTOM_THEME_DEFAULT,
  };
}

export function ThemeRow({ binding }: { binding: Binding }) {
  const { patch, mode, presetId, systemLightId, systemDarkId, custom } =
    readTheme(binding);
  return (
    <>
      <Settings.ItemDetails>
        <Settings.ItemTitle>Interface theme</Settings.ItemTitle>
        <Settings.ItemDescription>
          Select or customize your interface color scheme.
        </Settings.ItemDescription>
      </Settings.ItemDetails>
      <Settings.ItemControl>
        <ThemeSelect
          mode={mode}
          presetId={presetId}
          systemLight={presetDefById(systemLightId)}
          systemDark={presetDefById(systemDarkId)}
          custom={custom}
          onChange={patch}
        />
      </Settings.ItemControl>
    </>
  );
}

export function SystemPresetRow({
  binding,
  kind,
}: {
  binding: Binding;
  kind: "light" | "dark";
}) {
  const { patch, systemLightId, systemDarkId } = readTheme(binding);
  const isLight = kind === "light";
  return (
    <>
      <Settings.ItemDetails>
        <Settings.ItemTitle>{isLight ? "Light" : "Dark"}</Settings.ItemTitle>
        <Settings.ItemDescription>
          Theme to use for {isLight ? "light" : "dark"} system appearance.
        </Settings.ItemDescription>
      </Settings.ItemDetails>
      <Settings.ItemControl>
        <PresetSelect
          presets={isLight ? lightPresets() : darkPresets()}
          value={isLight ? systemLightId : systemDarkId}
          onChange={(id) =>
            patch(isLight ? { systemLightId: id } : { systemDarkId: id })
          }
        />
      </Settings.ItemControl>
    </>
  );
}

export function CustomColorRow({
  binding,
  field,
}: {
  binding: Binding;
  field: "accent" | "base";
}) {
  const { patch, custom } = readTheme(binding);
  const isAccent = field === "accent";
  return (
    <>
      <Settings.ItemDetails>
        <Settings.ItemTitle>
          {isAccent ? "Accent" : "Background"}
        </Settings.ItemTitle>
        <Settings.ItemDescription>
          {isAccent
            ? "The primary color for buttons, links, and selection."
            : "The base color the rest of the interface is built from."}
        </Settings.ItemDescription>
      </Settings.ItemDetails>
      <Settings.ItemControl>
        <ColorField
          aria-label={isAccent ? "Accent color" : "Background color"}
          value={custom[field]}
          onChange={(hex) => patch({ custom: { ...custom, [field]: hex } })}
        />
      </Settings.ItemControl>
    </>
  );
}

export function ContrastRow({ binding }: { binding: Binding }) {
  const { patch, custom } = readTheme(binding);
  return (
    <>
      <Settings.ItemDetails>
        <Settings.ItemTitle>Contrast</Settings.ItemTitle>
        <Settings.ItemDescription>
          How strongly backgrounds, borders, and text separate.
        </Settings.ItemDescription>
      </Settings.ItemDetails>
      <Settings.ItemControl>
        <RangeField
          aria-label="Contrast"
          min={CONTRAST_MIN}
          max={CONTRAST_MAX}
          step={5}
          value={custom.contrast}
          onValueChange={(n) => patch({ custom: { ...custom, contrast: n } })}
        />
      </Settings.ItemControl>
    </>
  );
}
