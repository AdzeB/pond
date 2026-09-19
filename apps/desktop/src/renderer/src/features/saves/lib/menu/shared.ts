import type { MenuItemSpec } from "@pond/ui";
import { type ComponentType, createElement, type ReactElement } from "react";
import { notify } from "@/shared/lib/toast";

export function glyph(Icon: ComponentType): ReactElement {
  return createElement(Icon);
}

export function submenuHidden(items: MenuItemSpec[]): boolean {
  return items.every(
    (item) =>
      item.type === "separator" ||
      item.type === "custom" ||
      Boolean("hidden" in item && item.hidden),
  );
}

export function notifyCopy(result: { ok: boolean; message: string }): void {
  if (!result.ok) return;
  notify({ id: "copy-selection", title: result.message });
}
