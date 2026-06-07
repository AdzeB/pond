import { IconNut2Fill18 } from "@pond/icons/fill/18";
import { Menu } from "@pond/ui";
import { DisplaySection } from "./sections/display";
import { LayoutSection } from "./sections/layout";
import { SortSection } from "./sections/sort";
import { ZoomSection } from "./sections/zoom";

function ViewMenu() {
  return (
    <Menu.Root>
      <Menu.Trigger icon aria-label="View options">
        <IconNut2Fill18 width="16" height="16" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" sideOffset={6}>
          <Menu.Popup style={{ width: "256px" }}>
            <LayoutSection />
            <Menu.Separator />
            <SortSection />
            <Menu.Separator />
            <DisplaySection />
            <Menu.Separator />
            <ZoomSection />
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

export const View = { Menu: ViewMenu };

export { useView } from "./context";
