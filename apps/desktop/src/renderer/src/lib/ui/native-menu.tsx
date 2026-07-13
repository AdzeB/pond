/** Imperative context menu: callers pass items with handlers to `showContextMenu`, and a single mounted `ContextMenuHost` renders the styled `Menu` at the cursor. */

import { Menu, type MenuItemSpec } from "@pond/ui";
import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import { type CSSProperties, type ReactNode, useMemo } from "react";

export interface NativeMenuItem {
  type?: "normal" | "separator" | "submenu" | "checkbox";
  label?: string;
  enabled?: boolean;
  checked?: boolean;
  /** Leading glyph rendered before the label. */
  icon?: ReactNode;
  /** Symbol tokens (e.g. ["⌘", "C"]) shown right-aligned; display only. */
  shortcut?: string[];
  submenu?: NativeMenuItem[];
  onSelect?: () => void | Promise<void>;
}

interface MenuState {
  items: MenuItemSpec[];
  x: number;
  y: number;
  /** Bumped on every open so re-opening at a new spot re-anchors the popup. */
  nonce: number;
}

const store = new Store<MenuState | null>(null);

/** Anchoring to the last pointer-down means right-clicks and button presses both open at the cursor without threading coordinates through call sites. */
let lastPointer = { x: 0, y: 0 };
let nonce = 0;

if (typeof window !== "undefined") {
  const track = (e: PointerEvent | MouseEvent) => {
    lastPointer = { x: e.clientX, y: e.clientY };
  };
  window.addEventListener("pointerdown", track, true);
  window.addEventListener("contextmenu", track, true);
}

function toSpec(item: NativeMenuItem): MenuItemSpec {
  if (item.type === "separator") return { type: "separator" };

  if (item.submenu && item.submenu.length > 0) {
    return {
      type: "submenu",
      label: item.label ?? "",
      icon: item.icon,
      disabled: item.enabled === false,
      items: item.submenu.map(toSpec),
    };
  }

  const onSelect = item.onSelect;
  return {
    label: item.label ?? "",
    icon: item.icon,
    disabled: item.enabled === false,
    shortcut: item.shortcut,
    onClick: onSelect ? () => void onSelect() : undefined,
  };
}

/** Lets the same builders drive both the right-click context menu and an anchored dropdown. */
export function toMenuSpecs(items: NativeMenuItem[]): MenuItemSpec[] {
  return items.map(toSpec);
}

export function showContextMenu(items: NativeMenuItem[]): Promise<void> {
  store.setState(() => ({
    items: items.map(toSpec),
    x: lastPointer.x,
    y: lastPointer.y,
    nonce: nonce++,
  }));
  return Promise.resolve();
}

/** Sizing mirrors a native menu: hug the widest item but never get too narrow. */
const POPUP_STYLE = {
  "--popup-width": "max-content",
  "--popup-min-width": "180px",
} as CSSProperties;

/** Mounted once near the app root; owns the single live context menu. */
export function ContextMenuHost() {
  const state = useSelector(store, (s) => s);

  const anchor = useMemo(() => {
    if (!state) return undefined;
    const { x, y } = state;
    return { getBoundingClientRect: () => new DOMRect(x, y, 0, 0) };
  }, [state]);

  return (
    <Menu.Root
      open={state != null}
      onOpenChange={(open) => {
        if (!open) store.setState(() => null);
      }}
      modal
    >
      <Menu.Portal>
        <Menu.Positioner
          anchor={anchor}
          side="bottom"
          align="start"
          sideOffset={0}
          style={POPUP_STYLE}
        >
          <Menu.Popup>
            {state ? <Menu.Items items={state.items} /> : null}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
