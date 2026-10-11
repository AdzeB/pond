import { DEFAULT_PREFS } from "@pond/schema/db";
import type { CSSProperties } from "react";
import { z } from "zod";
import type { Binding } from "@/features/settings/components/engine";
import { listAppIconPreviews } from "@/features/settings/lib/app-icon-previews";
import styles from "./styles.module.css";

const ICONS = listAppIconPreviews();

const StoredIconIdSchema = z.string().catch(DEFAULT_PREFS.window.appIcon);

interface TintStyle extends CSSProperties {
  "--tint": string;
}

export function AppIconRow({ binding }: { binding: Binding }) {
  const stored = StoredIconIdSchema.parse(binding.values.appIcon);
  const selected = ICONS.some((icon) => icon.id === stored)
    ? stored
    : DEFAULT_PREFS.window.appIcon;

  return (
    <div className={styles.grid} role="listbox" aria-label="App icon">
      {ICONS.map((icon) => {
        const isSelected = icon.id === selected;
        const tint: TintStyle | undefined = icon.tint
          ? { "--tint": icon.tint }
          : undefined;
        return (
          <button
            key={icon.id}
            type="button"
            className={styles.cell}
            aria-label={icon.label}
            aria-selected={isSelected}
            data-selected={isSelected || undefined}
            role="option"
            style={tint}
            onClick={() => binding.patch({ appIcon: icon.id })}
          >
            <img src={icon.preview} alt="" draggable={false} />
          </button>
        );
      })}
    </div>
  );
}
