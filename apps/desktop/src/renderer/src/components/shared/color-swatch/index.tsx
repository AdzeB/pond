import { Menu, type MenuItemSpec } from "@pond/ui";
import { type CSSProperties, useEffect, useState } from "react";
import { closeSave } from "@/lib/ui/save-nav";
import { colorCopyFormats } from "@/lib/util/color";
import { setQuery } from "@/stores/view-store";
import styles from "./styles.module.css";

const POPUP_STYLE = {
  "--popup-width": "max-content",
  "--popup-min-width": "200px",
} as CSSProperties;

const COPIED_HOLD_MS = 1200;

function findSimilar(hex: string): void {
  setQuery({
    combinator: "and",
    rules: [{ field: "color", operator: "near", value: hex }],
  });
  closeSave();
}

export function ColorSwatch({ color }: { color: string }) {
  const formats = colorCopyFormats(color);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), COPIED_HOLD_MS);
    return () => window.clearTimeout(timer);
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
            className={styles.swatch}
            style={{ background: color, color }}
            title={color}
            aria-label={copied ? `Copied ${color}` : `Color ${color}`}
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
