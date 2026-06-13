import { ContextMenu, Kbd, Menu } from "@pond/ui";
import { type ReactElement, type ReactNode, useState } from "react";
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

// The library mounts one of these per visible card, so building the action
// list (and the `useTagClipboard` subscription inside `useSaveActions`) only
// once the menu opens keeps a clipboard change from re-rendering every card.
export function SaveContextMenu({ save, children }: SaveContextMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <ContextMenu.Root open={open} onOpenChange={setOpen}>
      <ContextMenu.Trigger render={children} />
      {open ? <SaveContextMenuContent save={save} /> : null}
    </ContextMenu.Root>
  );
}

function SaveContextMenuContent({ save }: { save: Save }) {
  const actions = useSaveActions(save);
  return (
    <ContextMenu.Portal>
      <ContextMenu.Backdrop />
      <ContextMenu.Positioner>
        <ContextMenu.Popup>
          {actions.map(renderContextAction)}
        </ContextMenu.Popup>
      </ContextMenu.Positioner>
    </ContextMenu.Portal>
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
