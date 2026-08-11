import type { ThemeDef } from "@pond/schema/db";
import { Select, type SelectItemSpec } from "@pond/ui";
import styles from "./styles.module.css";

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
              items={presets.map(
                (preset): SelectItemSpec<string> => ({
                  value: preset.id,
                  label: <ThemeOption def={preset.def} label={preset.name} />,
                }),
              )}
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
      style={{ background: def.background, color: def.accent }}
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
