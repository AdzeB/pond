import {
  IconCopyOutline18,
  IconMagnifierOutline18,
} from "@pond/icons/outline/18";
import { Menu, type MenuItemSpec } from "@pond/ui";
import { useEffect, useState } from "react";
import { setQuery } from "@/features/library/state/view-store";
import { closeSave } from "@/features/saves/lib/save-nav";
import { SpecMenu } from "@/shared/components/spec-context-menu/spec-context-menu";
import { colorCopyFormats } from "@/shared/lib/color";
import styles from "./color-swatch.module.css";

const COPIED_HOLD_MS = 1200;

function findSimilar(hex: string): void {
  setQuery({
    combinator: "and",
    rules: [{ field: "color", operator: "near", value: hex }],
  });
  closeSave();
}

export function buildColorSwatchMenu(
  color: string,
  copyValue: (value: string) => void,
): MenuItemSpec[] {
  const formats = colorCopyFormats(color);
  if (!formats) return [];
  return [
    {
      label: "Find Similar Color Items",
      icon: <IconMagnifierOutline18 />,
      keywords: "color similar",
      onClick: () => findSimilar(color),
    },
    { type: "separator" },
    ...formats.primary.map((format) => ({
      label: `Copy ${format.label}`,
      icon: <IconCopyOutline18 />,
      onClick: () => copyValue(format.value),
    })),
    { type: "separator" },
    ...formats.secondary.map((format) => ({
      label: `Copy ${format.label}`,
      icon: <IconCopyOutline18 />,
      onClick: () => copyValue(format.value),
    })),
  ];
}

export function ColorSwatch({ color }: { color: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), COPIED_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copyValue = async (value: string): Promise<void> => {
    const written = await navigator.clipboard.writeText(value).then(
      () => true,
      () => false,
    );
    if (written) setCopied(true);
  };

  return (
    <SpecMenu
      buildItems={() =>
        buildColorSwatchMenu(color, (value) => void copyValue(value))
      }
    >
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
    </SpecMenu>
  );
}
