import { IconSliders3Fill18 as ViewIcon } from "@pond/icons/fill/18";
import { Button, Menu, Tooltip } from "@pond/ui";
import { FilterSubmenu } from "@/components/library-filter-panel";
import { DisplaySection } from "./sections/display";
import { LayoutSection } from "./sections/layout";
import { SortSection } from "./sections/sort";
import { ZoomSection } from "./sections/zoom";
import submenu from "./submenu.module.css";

export function ViewMenu() {
  return (
    <Menu.Root>
      <Tooltip label="View options" side="bottom">
        <Menu.Trigger
          render={
            <Button
              icon
              variant="primary"
              className={submenu.barTrigger}
              aria-label="View options"
            />
          }
        >
          <ViewIcon />
        </Menu.Trigger>
      </Tooltip>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" sideOffset={4}>
          <Menu.Popup>
            <FilterSubmenu />
            <SortSection />
            <LayoutSection />
            <DisplaySection />
            <ZoomSection />
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
