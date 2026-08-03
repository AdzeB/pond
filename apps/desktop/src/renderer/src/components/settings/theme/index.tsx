import {
  darkPresets,
  getPreset,
  lightPresets,
  type ThemeDef,
} from "@pond/schema/db";
import { Select, type SelectItemSpec } from "@pond/ui";
import { useMediaMatch } from "rooks";
import styles from "./styles.module.css";

const THEME_VALUE_SYSTEM = "system";
const THEME_VALUE_CUSTOM = "custom";
const PRESET_PREFIX = "preset:";

function themeValueLabel(value: string): string {
  if (value === THEME_VALUE_SYSTEM) return "System";
  if (value === THEME_VALUE_CUSTOM) return "Custom";
  if (value.startsWith(PRESET_PREFIX)) {
    const id = value.slice(PRESET_PREFIX.length);
    return getPreset(id)?.name ?? id;
  }
  return value;
}

type ThemeChange =
  | { themeMode: "system" }
  | { themeMode: "custom" }
  | { themeMode: "preset"; presetId: string };

interface ThemeSelectProps {
  mode: "system" | "preset" | "custom";
  presetId: string;
  systemLight: ThemeDef;
  systemDark: ThemeDef;
  custom: ThemeDef;
  onChange: (next: ThemeChange) => void;
}

export function ThemeSelect({
  mode,
  presetId,
  systemLight,
  systemDark,
  custom,
  onChange,
}: ThemeSelectProps) {
  const value =
    mode === "system"
      ? THEME_VALUE_SYSTEM
      : mode === "custom"
        ? THEME_VALUE_CUSTOM
        : `${PRESET_PREFIX}${presetId}`;

  const onValueChange = (next: string | null) => {
    if (!next) return;
    if (next === THEME_VALUE_SYSTEM) onChange({ themeMode: "system" });
    else if (next === THEME_VALUE_CUSTOM) onChange({ themeMode: "custom" });
    else if (next.startsWith(PRESET_PREFIX))
      onChange({
        themeMode: "preset",
        presetId: next.slice(PRESET_PREFIX.length),
      });
  };

  const renderValue = (v: string) => {
    if (v === THEME_VALUE_SYSTEM)
      return <SystemOption light={systemLight} dark={systemDark} />;
    if (v === THEME_VALUE_CUSTOM)
      return <ThemeOption def={custom} label="Custom" />;
    if (v.startsWith(PRESET_PREFIX)) {
      const id = v.slice(PRESET_PREFIX.length);
      const preset = getPreset(id);
      if (preset) return <ThemeOption def={preset.def} label={preset.name} />;
    }
    return themeValueLabel(v);
  };

  const items: SelectItemSpec<string>[] = [
    {
      value: THEME_VALUE_SYSTEM,
      label: <SystemOption light={systemLight} dark={systemDark} />,
    },
    { type: "separator" },
    ...lightPresets().map((preset) => ({
      value: `${PRESET_PREFIX}${preset.id}`,
      label: <ThemeOption def={preset.def} label={preset.name} />,
    })),
    { type: "separator" },
    ...darkPresets().map((preset) => ({
      value: `${PRESET_PREFIX}${preset.id}`,
      label: <ThemeOption def={preset.def} label={preset.name} />,
    })),
    { type: "separator" },
    {
      value: THEME_VALUE_CUSTOM,
      label: <ThemeOption def={custom} label="Custom" />,
    },
  ];

  return (
    <Select.Root value={value} onValueChange={onValueChange}>
      <Select.Trigger>
        <Select.Value>{(v: string) => renderValue(v)}</Select.Value>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner sideOffset={6}>
          <Select.Popup>
            <Select.Items items={items} />
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}

interface PresetSelectProps {
  presets: { id: string; name: string; def: ThemeDef }[];
  value: string;
  onChange: (id: string) => void;
}

export function PresetSelect({ presets, value, onChange }: PresetSelectProps) {
  return (
    <Select.Root
      value={value}
      onValueChange={(v) => {
        if (v) onChange(v);
      }}
    >
      <Select.Trigger>
        <Select.Value>
          {(v: string) => {
            const preset = presets.find((p) => p.id === v);
            return preset ? (
              <ThemeOption def={preset.def} label={preset.name} />
            ) : (
              v
            );
          }}
        </Select.Value>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner sideOffset={6}>
          <Select.Popup>
            <Select.Items
              items={presets.map((preset) => ({
                value: preset.id,
                label: <ThemeOption def={preset.def} label={preset.name} />,
              }))}
            />
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}

function ThemeChip({ def }: { def: ThemeDef }) {
  return (
    <span
      aria-hidden
      className={styles.chip}
      style={{ background: def.base, color: def.accent }}
    >
      Aa
    </span>
  );
}

function ThemeOption({ def, label }: { def: ThemeDef; label: string }) {
  return (
    <span className={styles.option}>
      <ThemeChip def={def} />
      <span>{label}</span>
    </span>
  );
}

function SystemOption({ light, dark }: { light: ThemeDef; dark: ThemeDef }) {
  const prefersDark = useMediaMatch("(prefers-color-scheme: dark)");
  return (
    <span className={styles.option}>
      <ThemeChip def={prefersDark ? dark : light} />
      <span>System Preference</span>
    </span>
  );
}
