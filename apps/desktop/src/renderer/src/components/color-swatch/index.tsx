import { IconCheck3Outline12 as Check } from "@pond/icons/outline/12";
import { Menu, type MenuItemSpec } from "@pond/ui";
import { type CSSProperties, useEffect, useState } from "react";
import { colorCopyFormats } from "@/lib/util/color";
import { primarySelection } from "@/stores/selection";
import { setQuery } from "@/stores/view-store";
import styles from "./styles.module.css";

/** Hug the widest copy label but stay menu-sized, mirroring the native menu host. */
const POPUP_STYLE = {
  "--popup-width": "max-content",
  "--popup-min-width": "200px",
} as CSSProperties;

/** How long the swatch wears the checkmark after a copy. */
const COPIED_HOLD_MS = 1200;

/** Dismisses the detail modal so the freshly-filtered grid is what the user lands on. */
function findSimilar(hex: string): void {
  setQuery({
    combinator: "and",
    rules: [{ field: "color", operator: "near", value: hex }],
  });
  primarySelection.set(null);
}

export function ColorSwatch({ color }: { color: string }) {
  const formats = colorCopyFormats(color);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), COPIED_HOLD_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const copyValue = async (value: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      /** Clipboard can reject without focus; nothing to confirm. */
    }
  };

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
            className={styles["color-swatch"]}
            style={{ background: color }}
            aria-label={copied ? `Copied ${color}` : `Color ${color}`}
          >
            {copied ? (
              <span className={styles["copied-check"]} aria-hidden>
                <Check width={12} height={12} strokeWidth={2.5} />
              </span>
            ) : null}
          </button>
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
