import { IconChevronExpandYOutline18 as ChevronsUpDown } from "@pond/icons/outline/18";
import { darkPresets, lightPresets, type ThemeDef } from "@pond/schema/db";
import { Select } from "@pond/ui";
import styles from "./styles.module.css";

const THEME_VALUE_SYSTEM = "system";
const THEME_VALUE_CUSTOM = "custom";
const PRESET_PREFIX = "preset:";

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

  return (
    <Select.Root value={value} onValueChange={onValueChange}>
      <Select.Trigger>
        <Select.Value />
        <Select.Icon>
          <ChevronsUpDown />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner sideOffset={6}>
          <Select.Popup>
            <Select.Item value={THEME_VALUE_SYSTEM}>
              <SystemOption light={systemLight} dark={systemDark} />
            </Select.Item>
            <Select.Separator />
            {lightPresets().map((preset) => (
              <Select.Item
                key={preset.id}
                value={`${PRESET_PREFIX}${preset.id}`}
              >
                <ThemeOption def={preset.def} label={preset.name} />
              </Select.Item>
            ))}
            <Select.Separator />
            {darkPresets().map((preset) => (
              <Select.Item
                key={preset.id}
                value={`${PRESET_PREFIX}${preset.id}`}
              >
                <ThemeOption def={preset.def} label={preset.name} />
              </Select.Item>
            ))}
            <Select.Separator />
            <Select.Item value={THEME_VALUE_CUSTOM}>
              <ThemeOption def={custom} label="Custom" />
            </Select.Item>
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
        <Select.Value />
        <Select.Icon>
          <ChevronsUpDown />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner sideOffset={6}>
          <Select.Popup>
            {presets.map((preset) => (
              <Select.Item key={preset.id} value={preset.id}>
                <ThemeOption def={preset.def} label={preset.name} />
              </Select.Item>
            ))}
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
  return (
    <span className={styles.option}>
      <span
        aria-hidden
        className={styles.chip}
        style={{
          background: `linear-gradient(105deg, ${light.base} 0 50%, ${dark.base} 50% 100%)`,
          color: light.accent,
        }}
      >
        Aa
      </span>
      <span>System preference</span>
    </span>
  );
}
