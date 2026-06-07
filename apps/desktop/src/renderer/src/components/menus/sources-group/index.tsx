import { IconNavigationVerticalFill18 as Customize } from "@pond/icons/fill/18";
import { ContextMenu } from "@pond/ui";
import type { ReactElement } from "react";

interface SourcesGroupMenuProps {
  onCustomize: () => void;
  children: ReactElement;
}

export function SourcesGroupMenu({
  onCustomize,
  children,
}: SourcesGroupMenuProps) {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger render={children} />
      <ContextMenu.Portal>
        <ContextMenu.Positioner>
          <ContextMenu.Popup>
            <ContextMenu.Item onClick={onCustomize}>
              <ContextMenu.ItemIcon>
                <Customize width={14} height={14} />
              </ContextMenu.ItemIcon>
              <ContextMenu.ItemLabel>Customize sources</ContextMenu.ItemLabel>
            </ContextMenu.Item>
          </ContextMenu.Popup>
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
