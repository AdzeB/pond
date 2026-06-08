import { IconNavigationVerticalFill18 as Customize } from "@pond/icons/fill/18";
import { IconDotsOutline18 as Dots } from "@pond/icons/outline/18";
import type { Source } from "@pond/schema/db";
import { Menu, Sidebar } from "@pond/ui";
import { useNavigate } from "@tanstack/react-router";
import { getSourceDef } from "@/lib/sources/registry";

const ICON_SIZE = 18;

function SourceIcon({ source }: { source: Source }) {
  const Icon = getSourceDef(source).icon;
  return <Icon width={ICON_SIZE} height={ICON_SIZE} />;
}

interface MoreSourcesMenuProps {
  sources: readonly Source[];
  onCustomize: () => void;
}

export function MoreSourcesMenu({
  sources,
  onCustomize,
}: MoreSourcesMenuProps) {
  const navigate = useNavigate();

  return (
    <Menu.Root>
      <Menu.Trigger
        render={(props) => (
          <Sidebar.Item {...props}>
            <Sidebar.Icon>
              <Dots />
            </Sidebar.Icon>
            More
          </Sidebar.Item>
        )}
      />
      <Menu.Portal>
        <Menu.Positioner sideOffset={8} align="start">
          <Menu.Popup>
            {sources.map((source) => {
              const def = getSourceDef(source);
              return (
                <Menu.Item
                  key={source}
                  onClick={() =>
                    navigate({ to: "/source/$source", params: { source } })
                  }
                >
                  <Menu.ItemIcon>
                    <SourceIcon source={source} />
                  </Menu.ItemIcon>
                  <Menu.ItemLabel>{def.label}</Menu.ItemLabel>
                </Menu.Item>
              );
            })}
            <Menu.Separator />
            <Menu.Item onClick={onCustomize}>
              <Menu.ItemIcon>
                <Customize width={14} height={14} />
              </Menu.ItemIcon>
              <Menu.ItemLabel>Customize sources</Menu.ItemLabel>
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
