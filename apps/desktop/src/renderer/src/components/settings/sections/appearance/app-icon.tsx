import { DEFAULT_PREFS } from "@pond/schema/db";
import { Settings } from "@pond/ui";
import { useEffect, useState } from "react";
import type { Binding } from "@/components/settings/engine";
import styles from "./app-icon.module.css";

interface AppIconOption {
  id: string;
  label: string;
  preview: string;
}

export function AppIconRow({ binding }: { binding: Binding }) {
  const stored =
    typeof binding.values.appIcon === "string"
      ? binding.values.appIcon
      : DEFAULT_PREFS.window.appIcon;
  const [icons, setIcons] = useState<AppIconOption[]>([]);
  const selected = icons.some((icon) => icon.id === stored)
    ? stored
    : DEFAULT_PREFS.window.appIcon;

  useEffect(() => {
    void window.pond
      .query("appIcons.list", {})
      .then((rows) => {
        if (!Array.isArray(rows)) return;
        setIcons(rows as AppIconOption[]);
      })
      .catch(() => {});
  }, []);

  return (
    <div className={styles.row}>
      <Settings.ItemDetails>
        <Settings.ItemTitle>Icon</Settings.ItemTitle>
        <Settings.ItemDescription>
          Shown in the Dock and on the taskbar.
        </Settings.ItemDescription>
      </Settings.ItemDetails>
      <div className={styles.grid} role="radiogroup" aria-label="App icon">
        {icons.map((icon) => {
          const pressed = icon.id === selected;
          return (
            <label
              key={icon.id}
              className={styles.tile}
              data-selected={pressed || undefined}
              title={icon.label}
            >
              <input
                type="radio"
                name="app-icon"
                value={icon.id}
                checked={pressed}
                onChange={() => binding.patch({ appIcon: icon.id })}
                aria-label={icon.label}
              />
              <img src={icon.preview} alt="" draggable={false} />
            </label>
          );
        })}
      </div>
    </div>
  );
}
