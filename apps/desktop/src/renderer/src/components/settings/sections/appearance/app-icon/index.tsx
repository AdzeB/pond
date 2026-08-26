import { DEFAULT_PREFS } from "@pond/schema/db";
import type { CSSProperties } from "react";
import type { Binding } from "@/components/settings/engine";
import { listAppIconPreviews } from "@/lib/app-icon-previews";
import styles from "./styles.module.css";

const ICONS = listAppIconPreviews();

export function AppIconRow({ binding }: { binding: Binding }) {
  const stored =
    typeof binding.values.appIcon === "string"
      ? binding.values.appIcon
      : DEFAULT_PREFS.window.appIcon;
  const selected = ICONS.some((icon) => icon.id === stored)
    ? stored
    : DEFAULT_PREFS.window.appIcon;

  return (
    <div className={styles.grid} role="listbox" aria-label="App icon">
      {ICONS.map((icon) => {
        const isSelected = icon.id === selected;
        return (
          <button
            key={icon.id}
            type="button"
            className={styles.cell}
            aria-label={icon.label}
            aria-selected={isSelected}
            data-selected={isSelected || undefined}
            role="option"
            style={
              icon.tint ? ({ "--tint": icon.tint } as CSSProperties) : undefined
            }
            onClick={() => binding.patch({ appIcon: icon.id })}
          >
            <img src={icon.preview} alt="" draggable={false} />
          </button>
        );
      })}
    </div>
  );
}
