import { IconSliders3Fill18 as ViewIcon } from "@pond/icons/fill/18";
import { Menu, Tooltip } from "@pond/ui";
import { FilterSubmenu } from "@/components/library-filter-panel";
import { DisplaySection } from "./sections/display";
import { LayoutSection } from "./sections/layout";
import { SortSection } from "./sections/sort";
import { ZoomSection } from "./sections/zoom";
import submenu from "./submenu.module.css";

// Single toolbar dropdown gathering every view control (filter, sort, layout,
// display, zoom) as nested submenu rows, instead of one icon trigger each.
export function ViewMenu() {
  return (
    <Menu.Root>
      <Tooltip label="View options" side="bottom">
        <Menu.Trigger
          render={
            <button
              type="button"
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
          <Menu.Popup
            className={`${submenu.glassPopup} ${submenu.tailPopup}`}
            style={{ width: "240px" }}
          >
            <div className={submenu.barHeader}>View options</div>
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
