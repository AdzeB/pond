import { ContextMenu, Kbd, Menu } from "@pond/ui";
import type { ReactElement, ReactNode } from "react";
import type { Save } from "@/core/data/types";
import { type ActionDescriptor, useSaveActions } from "./actions";

const ICON_SIZE = 14;

function Icon({
  component: Component,
}: {
  component: React.ComponentType<{ width: number; height: number }>;
}) {
  return <Component width={ICON_SIZE} height={ICON_SIZE} />;
}

function renderContextAction(action: ActionDescriptor): ReactNode {
  if (action.type === "separator") {
    return <ContextMenu.Separator key={action.key} />;
  }
  if (action.type === "submenu") {
    return (
      <ContextMenu.SubmenuRoot key={action.key}>
        <ContextMenu.SubmenuTrigger disabled={action.disabled}>
          <ContextMenu.ItemIcon>
            <Icon component={action.icon} />
          </ContextMenu.ItemIcon>
          <ContextMenu.ItemLabel>{action.label}</ContextMenu.ItemLabel>
        </ContextMenu.SubmenuTrigger>
        <ContextMenu.Portal>
          <ContextMenu.Positioner>
            <ContextMenu.Popup>
              {action.items.map(renderContextAction)}
            </ContextMenu.Popup>
          </ContextMenu.Positioner>
        </ContextMenu.Portal>
      </ContextMenu.SubmenuRoot>
    );
  }
  return (
    <ContextMenu.Item
      key={action.key}
      disabled={action.disabled}
      data-variant={action.variant}
      onClick={() => void action.onSelect()}
    >
      <ContextMenu.ItemIcon>
        <Icon component={action.icon} />
      </ContextMenu.ItemIcon>
      <ContextMenu.ItemLabel>{action.label}</ContextMenu.ItemLabel>
      {action.shortcut ? (
        <ContextMenu.ItemKbd>
          <Kbd.Cluster keys={action.shortcut} />
        </ContextMenu.ItemKbd>
      ) : null}
    </ContextMenu.Item>
  );
}

function renderMenuAction(action: ActionDescriptor): ReactNode {
  if (action.type === "separator") {
    return <Menu.Separator key={action.key} />;
  }
  if (action.type === "submenu") {
    return (
      <Menu.SubmenuRoot key={action.key}>
        <Menu.SubmenuTrigger disabled={action.disabled}>
          <Menu.ItemIcon>
            <Icon component={action.icon} />
          </Menu.ItemIcon>
          <Menu.ItemLabel>{action.label}</Menu.ItemLabel>
        </Menu.SubmenuTrigger>
        <Menu.Portal>
          <Menu.Positioner>
            <Menu.Popup>{action.items.map(renderMenuAction)}</Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.SubmenuRoot>
    );
  }
  return (
    <Menu.Item
      key={action.key}
      disabled={action.disabled}
      data-variant={action.variant}
      onClick={() => void action.onSelect()}
    >
      <Menu.ItemIcon>
        <Icon component={action.icon} />
      </Menu.ItemIcon>
      <Menu.ItemLabel>{action.label}</Menu.ItemLabel>
      {action.shortcut ? (
        <Menu.ItemKbd>
          <Kbd.Cluster keys={action.shortcut} />
        </Menu.ItemKbd>
      ) : null}
    </Menu.Item>
  );
}

interface SaveContextMenuProps {
  save: Save;
  children: ReactElement;
}

export function SaveContextMenu({ save, children }: SaveContextMenuProps) {
  const actions = useSaveActions(save);

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger render={children} />
      <ContextMenu.Portal>
        <ContextMenu.Backdrop />
        <ContextMenu.Positioner>
          <ContextMenu.Popup>
            {actions.map(renderContextAction)}
          </ContextMenu.Popup>
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

interface SaveActionsMenuProps {
  save: Save;
  children: ReactElement;
}

export function SaveActionsMenu({ save, children }: SaveActionsMenuProps) {
  const actions = useSaveActions(save);

  return (
    <Menu.Root>
      <Menu.Trigger render={children} />
      <Menu.Portal>
        <Menu.Positioner align="end" side="bottom" sideOffset={4}>
          <Menu.Popup>{actions.map(renderMenuAction)}</Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
