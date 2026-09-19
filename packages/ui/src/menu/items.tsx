import { Children, Fragment, isValidElement, type ReactNode } from "react";

type MenuShortcut = string | string[];

interface MenuActionItem {
  type?: "item";
  id?: string;
  label: ReactNode;
  icon?: ReactNode;
  shortcut?: MenuShortcut;
  keywords?: string;
  disabled?: boolean;
  hidden?: boolean;
  stale?: boolean;
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
  keywords?: string;
  items: MenuItemSpec[];
}

interface MenuSubmenuItem {
  type: "submenu";
  id?: string;
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  hidden?: boolean;
  keywords?: string;
  items: MenuItemSpec[];
}

interface MenuCheckboxItem {
  type: "checkbox";
  label: ReactNode;
  icon?: ReactNode;
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  shortcut?: MenuShortcut;
  keywords?: string;
  disabled?: boolean;
  hidden?: boolean;
  closeOnClick?: boolean;
}

interface MenuLinkItem {
  type: "link";
  label: ReactNode;
  href: string;
  icon?: ReactNode;
  shortcut?: MenuShortcut;
  keywords?: string;
  disabled?: boolean;
  hidden?: boolean;
  onClick?: () => void;
}

interface MenuCustomItem {
  type: "custom";
  render: () => ReactNode;
}

export type MenuItemSpec =
  | MenuActionItem
  | MenuSeparatorItem
  | MenuGroupItem
  | MenuSubmenuItem
  | MenuCheckboxItem
  | MenuLinkItem
  | MenuCustomItem;

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
  ItemKeyboard: React.ComponentType<{ children?: MenuShortcut }>;
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

function specKey(spec: MenuItemSpec, index: number): string | number {
  if ("id" in spec && spec.id) return spec.id;
  if (spec.type === "separator") return `sep-${index}`;
  if ("label" in spec) {
    const labels = Children.toArray(spec.label);
    const label = labels.length === 1 ? labels[0] : null;
    if (label != null && !isValidElement(label)) return String(label);
  }
  return index;
}

function renderSpec(
  spec: MenuItemSpec,
  key: string | number,
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
        {pruneSpecs(spec.items).map((child, i) =>
          renderSpec(child, specKey(child, i), parts),
        )}
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
        {spec.icon != null ? (
          <parts.ItemIcon>{spec.icon}</parts.ItemIcon>
        ) : null}
        <parts.ItemLabel>{spec.label}</parts.ItemLabel>
        {spec.shortcut != null ? (
          <parts.ItemKeyboard>{spec.shortcut}</parts.ItemKeyboard>
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
          <parts.ItemKeyboard>{spec.shortcut}</parts.ItemKeyboard>
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
                renderSpec(child, specKey(child, i), parts),
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
        <parts.ItemKeyboard>{spec.shortcut}</parts.ItemKeyboard>
      ) : null}
    </parts.Item>
  );
}

export function renderMenuSpec(
  items: MenuItemSpec[],
  parts: MenuParts,
): ReactNode {
  return pruneSpecs(items).map((spec, i) =>
    renderSpec(spec, specKey(spec, i), parts),
  );
}
