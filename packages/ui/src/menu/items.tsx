import { Fragment, type ReactNode } from "react";

/** Display-only keyboard hint, e.g. "⌘C" or ["⇧", "⌘", "C"]. */
type MenuShortcut = string | string[];

interface MenuActionItem {
  type?: "item";
  label: ReactNode;
  icon?: ReactNode;
  shortcut?: MenuShortcut;
  disabled?: boolean;
  stale?: boolean;
  /** Keep the menu open after selecting (defaults to closing). */
  closeOnClick?: boolean;
  onClick?: () => void;
}

interface MenuSeparatorItem {
  type: "separator";
}

interface MenuGroupItem {
  type: "group";
  label?: ReactNode;
  items: MenuItemSpec[];
}

interface MenuSubmenuItem {
  type: "submenu";
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  items: MenuItemSpec[];
}

/** Escape hatch for dynamic/stateful content (search inputs, empty states). */
interface MenuCustomItem {
  type: "custom";
  render: () => ReactNode;
}

/** A single node in a data-driven menu. */
export type MenuItemSpec =
  | MenuActionItem
  | MenuSeparatorItem
  | MenuGroupItem
  | MenuSubmenuItem
  | MenuCustomItem;

/**
 * The wrapped Base UI parts a renderer needs. Injected so the same logic can
 * drive both `Menu` and `ContextMenu`, which share these primitives.
 */
export interface MenuParts {
  Item: React.ComponentType<{
    disabled?: boolean;
    stale?: boolean;
    closeOnClick?: boolean;
    onClick?: () => void;
    children?: ReactNode;
  }>;
  ItemIcon: React.ComponentType<{ children?: ReactNode }>;
  ItemLabel: React.ComponentType<{ children?: ReactNode }>;
  ItemKeyboard: React.ComponentType<{ children?: ReactNode }>;
  Separator: React.ComponentType;
  Group: React.ComponentType<{ children?: ReactNode }>;
  GroupLabel: React.ComponentType<{ children?: ReactNode }>;
  SubmenuRoot: React.ComponentType<{ children?: ReactNode }>;
  SubmenuTrigger: React.ComponentType<{
    disabled?: boolean;
    children?: ReactNode;
  }>;
  Portal: React.ComponentType<{ children?: ReactNode }>;
  Positioner: React.ComponentType<{
    children?: ReactNode;
    sideOffset?: number;
  }>;
  Popup: React.ComponentType<{ children?: ReactNode }>;
}

function shortcutToString(shortcut: MenuShortcut): string {
  return Array.isArray(shortcut) ? shortcut.join("") : shortcut;
}

function renderSpec(
  spec: MenuItemSpec,
  key: number,
  parts: MenuParts,
): ReactNode {
  if (spec.type === "separator") {
    return <parts.Separator key={key} />;
  }

  if (spec.type === "custom") {
    return <Fragment key={key}>{spec.render()}</Fragment>;
  }

  if (spec.type === "group") {
    return (
      <parts.Group key={key}>
        {spec.label != null ? (
          <parts.GroupLabel>{spec.label}</parts.GroupLabel>
        ) : null}
        {spec.items.map((child, i) => renderSpec(child, i, parts))}
      </parts.Group>
    );
  }

  if (spec.type === "submenu") {
    return (
      <parts.SubmenuRoot key={key}>
        <parts.SubmenuTrigger disabled={spec.disabled}>
          {spec.icon != null ? (
            <parts.ItemIcon>{spec.icon}</parts.ItemIcon>
          ) : null}
          <parts.ItemLabel>{spec.label}</parts.ItemLabel>
        </parts.SubmenuTrigger>
        <parts.Portal>
          <parts.Positioner sideOffset={-2}>
            <parts.Popup>
              {spec.items.map((child, i) => renderSpec(child, i, parts))}
            </parts.Popup>
          </parts.Positioner>
        </parts.Portal>
      </parts.SubmenuRoot>
    );
  }

  return (
    <parts.Item
      key={key}
      disabled={spec.disabled}
      stale={spec.stale}
      closeOnClick={spec.closeOnClick}
      onClick={spec.onClick}
    >
      {spec.icon != null ? <parts.ItemIcon>{spec.icon}</parts.ItemIcon> : null}
      <parts.ItemLabel>{spec.label}</parts.ItemLabel>
      {spec.shortcut != null ? (
        <parts.ItemKeyboard>
          {shortcutToString(spec.shortcut)}
        </parts.ItemKeyboard>
      ) : null}
    </parts.Item>
  );
}

/** Render a flat array of menu specs into the supplied wrapped parts. */
export function renderMenuSpec(
  items: MenuItemSpec[],
  parts: MenuParts,
): ReactNode {
  return items.map((spec, i) => renderSpec(spec, i, parts));
}
