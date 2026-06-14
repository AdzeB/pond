import { ContextMenu, Keyboard } from "@pond/ui";
import { type ReactElement, type ReactNode, useState } from "react";
import {
  type ActionDescriptor,
  useSaveActions,
} from "@/hooks/use-save-actions";
import type { Save } from "@/lib/types";

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
          <Keyboard.Cluster keys={action.shortcut} />
        </ContextMenu.ItemKbd>
      ) : null}
    </ContextMenu.Item>
  );
}

interface SaveContextMenuProps {
  save: Save;
  children: ReactElement;
}

// One per visible card, so build the action list only once the menu opens — a clipboard change won't re-render every card.
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
