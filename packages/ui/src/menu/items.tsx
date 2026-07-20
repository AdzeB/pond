import { Fragment, type ReactNode } from "react";

/** Display-only keyboard hint, e.g. "⌘C" or ["⇧", "⌘", "C"]. */
type MenuShortcut = string | string[];

interface MenuActionItem {
  type?: "item";
  label: ReactNode;
  icon?: ReactNode;
  shortcut?: MenuShortcut;
  disabled?: boolean;
  /** Omit entirely instead of rendering disabled; for actions the target can never support. */
  hidden?: boolean;
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
  hidden?: boolean;
  items: MenuItemSpec[];
}

interface MenuSubmenuItem {
  type: "submenu";
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  hidden?: boolean;
  items: MenuItemSpec[];
}

interface MenuCheckboxItem {
  type: "checkbox";
  label: ReactNode;
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  shortcut?: MenuShortcut;
  disabled?: boolean;
  hidden?: boolean;
  /** Keep the menu open after toggling (defaults to closing). */
  closeOnClick?: boolean;
}

interface MenuLinkItem {
  type: "link";
  label: ReactNode;
  /** Real destination, exposed for a11y and platform affordances. */
  href: string;
  icon?: ReactNode;
  shortcut?: MenuShortcut;
  disabled?: boolean;
  hidden?: boolean;
  /** Invoked with the default navigation prevented; delegate opening to the platform. */
  onClick?: () => void;
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
  | MenuCheckboxItem
  | MenuLinkItem
  | MenuCustomItem;

/**
 * The wrapped Base UI parts a renderer needs; injected so the same logic drives
 * both `Menu` and `ContextMenu`, which share these primitives.
 */
interface MenuParts {
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
  CheckboxItem: React.ComponentType<{
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    disabled?: boolean;
    closeOnClick?: boolean;
    children?: ReactNode;
  }>;
  CheckboxItemIndicator: React.ComponentType<{ children?: ReactNode }>;
  LinkItem: React.ComponentType<{
    href?: string;
    disabled?: boolean;
    onClick?: (event: React.MouseEvent) => void;
    children?: ReactNode;
  }>;
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
    side?: "top" | "bottom" | "left" | "right" | "inline-start" | "inline-end";
    align?: "start" | "center" | "end";
    sideOffset?: number;
    alignOffset?: number;
  }>;
  Popup: React.ComponentType<{ children?: ReactNode }>;
}

function shortcutToString(shortcut: MenuShortcut): string {
  return Array.isArray(shortcut) ? shortcut.join("") : shortcut;
}

/** Drop hidden items, then collapse the leading/trailing/doubled separators they leave behind. */
function pruneSpecs(items: MenuItemSpec[]): MenuItemSpec[] {
  const visible = items.filter(
    (spec) =>
      spec.type === "separator" || spec.type === "custom" || !spec.hidden,
  );
  const out: MenuItemSpec[] = [];
  for (const spec of visible) {
    if (spec.type === "separator") {
      if (out.length === 0 || out[out.length - 1]?.type === "separator") {
        continue;
      }
    }
    out.push(spec);
  }
  while (out[out.length - 1]?.type === "separator") out.pop();
  return out;
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
        {pruneSpecs(spec.items).map((child, i) => renderSpec(child, i, parts))}
      </parts.Group>
    );
  }

  if (spec.type === "checkbox") {
    return (
      <parts.CheckboxItem
        key={key}
        checked={spec.checked}
        onCheckedChange={spec.onCheckedChange}
        disabled={spec.disabled}
        closeOnClick={spec.closeOnClick}
      >
        <parts.CheckboxItemIndicator />
        <parts.ItemLabel>{spec.label}</parts.ItemLabel>
        {spec.shortcut != null ? (
          <parts.ItemKeyboard>
            {shortcutToString(spec.shortcut)}
          </parts.ItemKeyboard>
        ) : null}
      </parts.CheckboxItem>
    );
  }

  if (spec.type === "link") {
    const onClick = spec.onClick;
    return (
      <parts.LinkItem
        key={key}
        href={spec.href}
        disabled={spec.disabled}
        onClick={
          onClick
            ? (event) => {
                event.preventDefault();
                onClick();
              }
            : undefined
        }
      >
        {spec.icon != null ? (
          <parts.ItemIcon>{spec.icon}</parts.ItemIcon>
        ) : null}
        <parts.ItemLabel>{spec.label}</parts.ItemLabel>
        {spec.shortcut != null ? (
          <parts.ItemKeyboard>
            {shortcutToString(spec.shortcut)}
          </parts.ItemKeyboard>
        ) : null}
      </parts.LinkItem>
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
          <parts.Positioner
            side="inline-end"
            align="start"
            sideOffset={-2}
            alignOffset={-4}
          >
            <parts.Popup>
              {pruneSpecs(spec.items).map((child, i) =>
                renderSpec(child, i, parts),
              )}
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
  return pruneSpecs(items).map((spec, i) => renderSpec(spec, i, parts));
}
