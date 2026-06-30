// Imperative context menu. Callers describe a menu with click handlers attached
// and call `showContextMenu(items)`; a single mounted `ContextMenuHost` renders
// our styled `Menu` anchored at the cursor. (Previously this popped the OS menu
// over IPC — now everything is the in-app surface so it matches the design.)

import { Menu, type MenuItemSpec } from "@pond/ui";
import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import { type CSSProperties, useMemo } from "react";

export interface NativeMenuItem {
  type?: "normal" | "separator" | "submenu" | "checkbox";
  label?: string;
  enabled?: boolean;
  checked?: boolean;
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

// The popup anchors to wherever the pointer last went down, so a right-click or
// a button press both open the menu at the cursor without threading coordinates
// through every call site.
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
      disabled: item.enabled === false,
      items: item.submenu.map(toSpec),
    };
  }

  const onSelect = item.onSelect;
  return {
    label: item.label ?? "",
    disabled: item.enabled === false,
    shortcut: item.shortcut,
    onClick: onSelect ? () => void onSelect() : undefined,
  };
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

// Sizing mirrors a native menu: hug the widest item but never get too narrow.
const POPUP_STYLE = {
  "--popup-width": "max-content",
  "--popup-min-width": "180px",
} as CSSProperties;

// Mounted once near the app root. Owns the single live context menu.
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
