import type { MenuItemSpec } from "@pond/ui";
import { Children, isValidElement, type ReactNode } from "react";

function labelText(label: ReactNode): string | null {
  const values = Children.toArray(label);
  const value = values.length === 1 ? values[0] : null;
  return value != null && !isValidElement(value) ? String(value) : null;
}

export function menuLabels(items: MenuItemSpec[]): string[] {
  return items.flatMap((item) => {
    if (item.type === "separator" || item.type === "custom") return [];
    if ("hidden" in item && item.hidden) return [];
    const label = "label" in item ? labelText(item.label) : null;
    const labels = label ? [label] : [];
    if (item.type === "group" || item.type === "submenu") {
      return [...labels, ...menuLabels(item.items)];
    }
    return labels;
  });
}

export function topLevelMenuLabels(items: MenuItemSpec[]): string[] {
  return items.flatMap((item) => {
    if (item.type === "separator" || item.type === "custom") return [];
    if ("hidden" in item && item.hidden) return [];
    const label = "label" in item ? labelText(item.label) : null;
    return label ? [label] : [];
  });
}

export function menuLabelsWithoutIcons(items: MenuItemSpec[]): string[] {
  return items.flatMap((item) => {
    if (item.type === "separator" || item.type === "custom") return [];
    if ("hidden" in item && item.hidden) return [];
    if (item.type === "group") return menuLabelsWithoutIcons(item.items);
    const label = "label" in item ? labelText(item.label) : null;
    const current =
      label && (!("icon" in item) || item.icon == null) ? [label] : [];
    if (item.type === "submenu") {
      return [...current, ...menuLabelsWithoutIcons(item.items)];
    }
    return current;
  });
}
