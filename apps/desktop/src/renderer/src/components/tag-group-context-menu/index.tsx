import { cloneElement, type MouseEvent, type ReactElement } from "react";
import { type NativeMenuItem, showContextMenu } from "@/lib/ui/native-menu";

// Native menus can't render color swatches, so colors are named items for now.
const GROUP_COLORS = [
  { label: "Red", value: "var(--ds-red-9)" },
  { label: "Orange", value: "var(--ds-orange-9)" },
  { label: "Amber", value: "var(--ds-amber-9)" },
  { label: "Green", value: "var(--ds-green-9)" },
  { label: "Teal", value: "var(--ds-teal-9)" },
  { label: "Blue", value: "var(--ds-blue-9)" },
  { label: "Violet", value: "var(--ds-violet-9)" },
  { label: "Pink", value: "var(--ds-pink-9)" },
] as const;

export interface TagGroupMenuActions {
  onRename: () => void;
  onSetColor: (color: string | null) => void;
  onRequestDelete: () => void;
}

export function buildTagGroupMenuItems(
  a: TagGroupMenuActions,
): NativeMenuItem[] {
  const colorItems: NativeMenuItem[] = GROUP_COLORS.map((c) => ({
    label: c.label,
    onSelect: () => a.onSetColor(c.value),
  }));
  colorItems.push(
    { type: "separator" },
    { label: "Clear color", onSelect: () => a.onSetColor(null) },
  );

  return [
    { label: "Rename", onSelect: a.onRename },
    { label: "Color", submenu: colorItems },
    { type: "separator" },
    { label: "Remove", onSelect: a.onRequestDelete },
  ];
}

interface TagGroupContextMenuProps extends TagGroupMenuActions {
  children: ReactElement<{ onContextMenu?: (e: MouseEvent) => void }>;
}

export function TagGroupContextMenu({
  children,
  ...actions
}: TagGroupContextMenuProps) {
  const onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    void showContextMenu(buildTagGroupMenuItems(actions));
  };
  return cloneElement(children, { onContextMenu });
}
