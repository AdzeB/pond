import {
  IconArrowRotateAnticlockwiseOutline18 as RotateCcw,
  IconSliderOutline18 as SlidersHorizontal,
} from "@pond/icons/outline/18";
import { Menu } from "@pond/ui";
import { useView } from "./context";
import { DisplaySection } from "./sections/display";
import { LayoutSection } from "./sections/layout";
import { SortSection } from "./sections/sort";
import { ZoomSection } from "./sections/zoom";

function ViewMenu() {
  return (
    <Menu.Root>
      <Menu.Trigger icon aria-label="View options">
        <SlidersHorizontal width="14" height="14" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" sideOffset={6}>
          <Menu.Popup>
            <LayoutSection />
            <Menu.Separator />
            <SortSection />
            <Menu.Separator />
            <DisplaySection />
            <Menu.Separator />
            <ZoomSection />
            <Menu.Separator />
            <RestoreDefaults />
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

function RestoreDefaults() {
  const { actions } = useView();
  return (
    <Menu.Item closeOnClick={false} onClick={() => actions.restoreDefaults()}>
      <Menu.ItemIcon>
        <RotateCcw width="14" height="14" />
      </Menu.ItemIcon>
      <Menu.ItemLabel>Restore defaults</Menu.ItemLabel>
    </Menu.Item>
  );
}

export const View = { Menu: ViewMenu };
export { useView } from "./context";
