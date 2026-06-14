import { IconArrowsRotateCenterFill18 as Restore } from "@pond/icons/fill/18";
import { Menu } from "@pond/ui";
import type { ReactElement } from "react";
import { FilterSubmenu } from "@/components/library-filter-panel";
import { useView } from "@/hooks/use-view";
import { DisplaySection } from "./sections/display";
import { LayoutSection } from "./sections/layout";
import { SortSection } from "./sections/sort";
import { ZoomSection } from "./sections/zoom";
import submenu from "./submenu.module.css";

interface ViewOptionsMenuProps {
  trigger: ReactElement;
  side?: "top" | "bottom";
  align?: "start" | "end";
}

// Layout/sort/display/zoom controls, shared by the toolbar and dock (just anchored to different edges).
export function ViewOptionsMenu({
  trigger,
  side = "bottom",
  align = "end",
}: ViewOptionsMenuProps) {
  const { actions } = useView();

  return (
    <Menu.Root>
      <Menu.Trigger render={trigger} />
      <Menu.Portal>
        <Menu.Positioner side={side} align={align} sideOffset={6}>
          <Menu.Popup style={{ width: "256px" }}>
            <FilterSubmenu />
            <SortSection />
            <LayoutSection />
            <DisplaySection />
            <ZoomSection />
            <Menu.Separator />
            <Menu.Item
              className={submenu.restore}
              onClick={() => actions.restoreDefaults()}
            >
              <Menu.ItemIcon style={{ color: "inherit" }}>
                <Restore />
              </Menu.ItemIcon>
              <Menu.ItemLabel>Restore defaults</Menu.ItemLabel>
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
