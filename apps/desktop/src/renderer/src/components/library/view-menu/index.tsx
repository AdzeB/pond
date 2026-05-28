import { Menu } from "@pond/ui";
import { RotateCcw } from "lucide-react";
import { type ReactElement, useState } from "react";
import { useFilterHotkey } from "@/lib/use-hotkeys";
import { useView } from "./context";
import { Root as Provider } from "./provider";
import { Density } from "./sections/density";
import { Display } from "./sections/display";
import { Filter } from "./sections/filter";
import { Layout } from "./sections/layout";
import { Sort } from "./sections/sort";
import { Zoom } from "./sections/zoom";
import styles from "./styles.module.css";
import { Trigger } from "./trigger";

interface PickerProps {
  trigger?: ReactElement;
}

// The eye-button dropdown. Expects a View.Provider above it in the tree.
function Picker({ trigger }: PickerProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <FilterHotkeyBridge setOpen={setOpen} />
      <Menu.Root open={open} onOpenChange={setOpen}>
        <Menu.Trigger render={trigger ?? <Trigger />} />
        <Menu.Portal>
          <Menu.Positioner side="bottom" align="end" sideOffset={6}>
            <Menu.Popup className={styles.popup}>
              <Layout />
              <Sort />
              <Density />
              <Display />
              <Zoom />
              <Filter />
              <Menu.Separator />
              <RestoreDefaults />
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </>
  );
}

function RestoreDefaults() {
  const { actions } = useView();
  return (
    <Menu.Item onClick={() => actions.restoreDefaults()}>
      <Menu.ItemIcon>
        <RotateCcw width="14" height="14" />
      </Menu.ItemIcon>
      <Menu.ItemLabel>Restore defaults</Menu.ItemLabel>
    </Menu.Item>
  );
}

function FilterHotkeyBridge({ setOpen }: { setOpen: (v: boolean) => void }) {
  useFilterHotkey(() => setOpen(true));
  return null;
}

export const View = { Provider, Picker, Trigger };
export { useView } from "./context";
