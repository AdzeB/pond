import type { Source } from "@pond/schema/db";
import { Menu } from "@pond/ui";
import type React from "react";
import { getSourceDef } from "@/lib/sources/registry";

interface AddSourceMenuProps {
  sources: readonly Source[];
  onConnect: (source: Source) => void;
  children: React.ReactElement;
}

export function AddSourceMenu({
  sources,
  onConnect,
  children,
}: AddSourceMenuProps) {
  return (
    <Menu.Root>
      <Menu.Trigger render={children} />
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="center" sideOffset={8}>
          <Menu.Popup style={{ minWidth: "200px" }}>
            {sources.map((source) => {
              const def = getSourceDef(source);
              const Icon = def.icon;
              return (
                <Menu.Item key={source} onClick={() => onConnect(source)}>
                  <Menu.ItemIcon>
                    <Icon width={16} height={16} />
                  </Menu.ItemIcon>
                  <Menu.ItemLabel>{def.label}</Menu.ItemLabel>
                </Menu.Item>
              );
            })}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
