import { Menu } from "@pond/ui";
import type { ReactElement } from "react";
import { DisplaySection } from "@/features/library/menus/view/sections/display";
import { LayoutSection } from "@/features/library/menus/view/sections/layout";
import { SortSection } from "@/features/library/menus/view/sections/sort";
import { ZoomSection } from "@/features/library/menus/view/sections/zoom";

interface ViewOptionsMenuProps {
  trigger: ReactElement;
  side?: "top" | "bottom";
  align?: "start" | "end";
}

// Layout / sort / display / zoom controls. Shared so the top toolbar and the
// bottom dock render the exact same menu, just anchored to different edges.
export function ViewOptionsMenu({
  trigger,
  side = "bottom",
  align = "end",
}: ViewOptionsMenuProps) {
  return (
    <Menu.Root>
      <Menu.Trigger render={trigger} />
      <Menu.Portal>
        <Menu.Positioner side={side} align={align} sideOffset={6}>
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
