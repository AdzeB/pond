import { Menu, type MenuItemSpec } from "@pond/ui";
import type { CSSProperties } from "react";
import { colorCopyFormats } from "@/lib/util/color";
import { primarySelection } from "@/stores/selection";
import { pushToast } from "@/stores/toasts";
import { setQuery } from "@/stores/view-store";
import styles from "./styles.module.css";

// Hug the widest copy label but stay menu-sized, mirroring the native menu host.
const POPUP_STYLE = {
  "--popup-width": "max-content",
  "--popup-min-width": "200px",
} as CSSProperties;

async function copyValue(value: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
    pushToast(`Copied ${value}`, "success");
  } catch {
    // Clipboard can reject without focus; skip the toast.
  }
}

// Filter the library to items near this colour, then dismiss the detail modal so
// the freshly-filtered grid is what the user lands on.
function findSimilar(hex: string): void {
  setQuery({
    combinator: "and",
    rules: [{ field: "color", operator: "near", value: hex }],
  });
  primarySelection.set(null);
}

export function ColorSwatch({ color }: { color: string }) {
  const formats = colorCopyFormats(color);

  const items: MenuItemSpec[] = formats
    ? [
        {
          label: "Find Similar Color Items",
          onClick: () => findSimilar(color),
        },
        { type: "separator" },
        ...formats.primary.map((f) => ({
          label: `Copy ${f.label}`,
          onClick: () => void copyValue(f.value),
        })),
        { type: "separator" },
        ...formats.secondary.map((f) => ({
          label: `Copy ${f.label}`,
          onClick: () => void copyValue(f.value),
        })),
      ]
    : [];

  return (
    <Menu.Root>
      <Menu.Trigger
        render={
          <button
            type="button"
            className={styles.colorSwatch}
            style={{ background: color }}
            aria-label={`Color ${color}`}
          />
        }
      />
      <Menu.Portal>
        <Menu.Positioner align="start" side="bottom" style={POPUP_STYLE}>
          <Menu.Popup>
            <Menu.Items items={items} />
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
