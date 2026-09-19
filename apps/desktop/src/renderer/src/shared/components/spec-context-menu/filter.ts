import type { MenuItemSpec } from "@pond/ui";
import { Children, isValidElement, type ReactNode } from "react";

function labelText(label: ReactNode): string {
  const labels = Children.toArray(label);
  const value = labels.length === 1 ? labels[0] : null;
  return value != null && !isValidElement(value) ? String(value) : "";
}

function keywordsOf(item: MenuItemSpec): string {
  return "keywords" in item ? (item.keywords ?? "") : "";
}

function haystack(item: MenuItemSpec): string {
  const label = "label" in item ? labelText(item.label) : "";
  return `${label} ${keywordsOf(item)}`.toLowerCase();
}

function isHidden(item: MenuItemSpec): boolean {
  return "hidden" in item && Boolean(item.hidden);
}

function isDisabled(item: MenuItemSpec): boolean {
  return "disabled" in item && Boolean(item.disabled);
}

function matchesCustom(needle: string): boolean {
  return /color|icon|swatch/.test(needle);
}

function leafMatches(item: MenuItemSpec, needle: string): boolean {
  if (item.type === "separator") return false;
  if (isHidden(item) || isDisabled(item)) return false;
  if (item.type === "custom") return matchesCustom(needle);
  if (item.type === "submenu" || item.type === "group") return false;
  return haystack(item).includes(needle);
}

function collectLeaves(
  items: MenuItemSpec[],
  needle: string,
  parentMatches: boolean,
): MenuItemSpec[] {
  const out: MenuItemSpec[] = [];
  for (const item of items) {
    if (item.type === "separator" || isHidden(item)) continue;
    if (item.type === "submenu" || item.type === "group") {
      if (isDisabled(item)) continue;
      const nested = collectLeaves(
        item.items,
        needle,
        parentMatches || haystack(item).includes(needle),
      );
      if (nested.length === 0) continue;
      out.push({
        type: "group",
        label: item.label,
        items: nested,
      });
      continue;
    }
    if (parentMatches && !isDisabled(item) && item.type !== "custom") {
      out.push(item);
      continue;
    }
    if (leafMatches(item, needle)) out.push(item);
  }
  return out;
}

export function filterMenuItems(
  items: MenuItemSpec[],
  query: string,
): MenuItemSpec[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return items;
  return collectLeaves(items, needle, false);
}

export function hasVisibleMenuItems(items: MenuItemSpec[]): boolean {
  return items.some((item) => item.type !== "separator");
}
