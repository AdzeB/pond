import {
  CONTRAST_MAX,
  CONTRAST_MIN,
  DEFAULT_DARK_THEME,
  DEFAULT_LIGHT_THEME,
  DEFAULT_PREFS,
  darkPresets,
  getPreset,
  lightPresets,
  type Prefs,
  type ThemeAppearance,
  type ThemeDef,
} from "@pond/schema/db";
import { ColorField, Select, Settings, Slider } from "@pond/ui";
import type { Binding } from "@/components/settings/engine";
import { PresetSelect } from "@/components/settings/theme";

const DEFAULTS = DEFAULT_PREFS.preferences;

type ThemePrefs = Prefs["preferences"];
type ThemeSide = "light" | "dark";

function readTheme(binding: Binding) {
  const values = binding.values as Partial<ThemePrefs>;
  const patch = binding.patch as (delta: Partial<ThemePrefs>) => void;
  return {
    patch,
    appearance: values.appearance ?? DEFAULTS.appearance,
    lightPresetId: values.lightPresetId ?? DEFAULTS.lightPresetId,
    darkPresetId: values.darkPresetId ?? DEFAULTS.darkPresetId,
    light: values.light ?? DEFAULT_LIGHT_THEME,
    dark: values.dark ?? DEFAULT_DARK_THEME,
  };
}

const APPEARANCE_OPTIONS: { value: ThemeAppearance; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export function AppearanceRow({ binding }: { binding: Binding }) {
  const { patch, appearance } = readTheme(binding);
  return (
    <>
      <Settings.ItemDetails>
        <Settings.ItemTitle>Appearance</Settings.ItemTitle>
        <Settings.ItemDescription>
          Follow the system, or lock the interface to light or dark.
        </Settings.ItemDescription>
      </Settings.ItemDetails>
      <Settings.ItemControl>
        <Select.Root
          value={appearance}
          onValueChange={(next) => {
            if (next === "system" || next === "light" || next === "dark") {
              patch({ appearance: next });
            }
          }}
        >
          <Select.Trigger>
            <Select.Value>
              {(v: string) =>
                APPEARANCE_OPTIONS.find((o) => o.value === v)?.label ?? v
              }
            </Select.Value>
          </Select.Trigger>
          <Select.Portal>
            <Select.Positioner sideOffset={6}>
              <Select.Popup>
                <Select.Items
                  items={APPEARANCE_OPTIONS.map((o) => ({
                    value: o.value,
                    label: o.label,
                  }))}
                />
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
      </Settings.ItemControl>
    </>
  );
}

function sideState(
  side: ThemeSide,
  state: ReturnType<typeof readTheme>,
): { presetId: string; def: ThemeDef } {
  return side === "light"
    ? { presetId: state.lightPresetId, def: state.light }
    : { presetId: state.darkPresetId, def: state.dark };
}

export function ThemePresetRow({
  binding,
  side,
}: {
  binding: Binding;
  side: ThemeSide;
}) {
  const state = readTheme(binding);
  const { presetId } = sideState(side, state);
  const presets = side === "light" ? lightPresets() : darkPresets();
  return (
    <>
      <Settings.ItemDetails>
        <Settings.ItemTitle>Preset</Settings.ItemTitle>
        <Settings.ItemDescription>
          Starting colors for this appearance. Editing a field below keeps this
          selection until you pick another preset.
        </Settings.ItemDescription>
      </Settings.ItemDetails>
      <Settings.ItemControl>
        <PresetSelect
          presets={presets}
          value={presetId}
          onChange={(id) => {
            const preset = getPreset(id);
            if (!preset) return;
            if (side === "light") {
              state.patch({
                lightPresetId: id,
                light: { ...preset.def },
              });
            } else {
              state.patch({
                darkPresetId: id,
                dark: { ...preset.def },
              });
            }
          }}
        />
      </Settings.ItemControl>
    </>
  );
}

export function ThemeColorRow({
  binding,
  side,
  field,
}: {
  binding: Binding;
  side: ThemeSide;
  field: "accent" | "background" | "foreground";
}) {
  const state = readTheme(binding);
  const { def } = sideState(side, state);
  const labels = {
    accent: {
      title: "Accent",
      description: "Primary color for buttons, links, and selection.",
    },
    background: {
      title: "Background",
      description: "Base surface the rest of the interface is built from.",
    },
    foreground: {
      title: "Foreground",
      description: "Primary text and high-contrast ink.",
    },
  } as const;
  const copy = labels[field];
  return (
    <>
      <Settings.ItemDetails>
        <Settings.ItemTitle>{copy.title}</Settings.ItemTitle>
        <Settings.ItemDescription>{copy.description}</Settings.ItemDescription>
      </Settings.ItemDetails>
      <Settings.ItemControl>
        <ColorField
          aria-label={`${side} ${copy.title.toLowerCase()}`}
          value={def[field]}
          onChange={(hex) => {
            if (side === "light") {
              state.patch({ light: { ...def, [field]: hex } });
            } else {
              state.patch({ dark: { ...def, [field]: hex } });
            }
          }}
        />
      </Settings.ItemControl>
    </>
  );
}

export function ThemeContrastRow({
  binding,
  side,
}: {
  binding: Binding;
  side: ThemeSide;
}) {
  const state = readTheme(binding);
  const { def } = sideState(side, state);
  return (
    <>
      <Settings.ItemDetails>
        <Settings.ItemTitle>Contrast</Settings.ItemTitle>
        <Settings.ItemDescription>
          How strongly backgrounds, borders, and text separate.
        </Settings.ItemDescription>
      </Settings.ItemDetails>
      <Settings.ItemControl>
        <Slider.Root
          min={CONTRAST_MIN}
          max={CONTRAST_MAX}
          step={5}
          value={def.contrast}
          onValueChange={(next) => {
            const contrast = typeof next === "number" ? next : (next[0] ?? 0);
            if (side === "light") {
              state.patch({ light: { ...def, contrast } });
            } else {
              state.patch({ dark: { ...def, contrast } });
            }
          }}
        >
          <Slider.Control>
            <Slider.Track>
              <Slider.Indicator />
              <Slider.Thumb aria-label={`${side} contrast`} />
            </Slider.Track>
          </Slider.Control>
          <Slider.Value />
        </Slider.Root>
      </Settings.ItemControl>
    </>
  );
}
