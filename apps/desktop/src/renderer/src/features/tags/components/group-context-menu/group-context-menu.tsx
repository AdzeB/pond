import {
  IconBarsFilterOutline18,
  IconPencilOutline18,
  IconTrash2Outline18,
} from "@pond/icons/outline/18";
import type { MenuItemSpec } from "@pond/ui";
import type { CSSProperties } from "react";
import { FOLDER_SWATCHES } from "@/features/library/components/folder-sidebar/folder-icons";
import { shortcutGlyphs } from "@/shared/lib/shortcuts";
import styles from "./styles.module.css";

export interface TagGroupMenuActions {
  color: string | null;
  tagCount: number;
  onFilter: () => void;
  onRename: () => void;
  onChangeColor: (color: string | null) => void;
  onRequestDelete: () => void;
}

function ColorSwatches({
  color,
  onChange,
}: {
  color: string | null;
  onChange: (color: string | null) => void;
}) {
  return (
    <fieldset className={styles.palette} aria-label="Group Color">
      {FOLDER_SWATCHES.map((swatch) => (
        <button
          key={swatch.label}
          type="button"
          className={styles.swatch}
          aria-label={swatch.label}
          aria-pressed={swatch.id === color}
          data-selected={swatch.id === color || undefined}
          style={
            // SAFETY: React forwards CSS custom properties to the element style.
            { "--swatch": swatch.css } as CSSProperties
          }
          onClick={() => onChange(swatch.id)}
        />
      ))}
    </fieldset>
  );
}

export function buildTagGroupMenuItems(a: TagGroupMenuActions): MenuItemSpec[] {
  return [
    {
      label: "Filter Items with the Tag(s)",
      icon: <IconBarsFilterOutline18 />,
      disabled: a.tagCount === 0,
      onClick: a.onFilter,
    },
    { type: "separator" },
    {
      label: "Rename",
      icon: <IconPencilOutline18 />,
      shortcut: shortcutGlyphs("tags.rename"),
      onClick: a.onRename,
    },
    {
      type: "custom",
      render: () => (
        <ColorSwatches color={a.color} onChange={a.onChangeColor} />
      ),
    },
    { type: "separator" },
    {
      label: "Remove",
      icon: <IconTrash2Outline18 />,
      onClick: a.onRequestDelete,
    },
  ];
}
