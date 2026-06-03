import { Menu } from "@pond/ui";
import { FolderPlus, RotateCcw, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { SaveSmartFolderDialog } from "../smart-folders/save-dialog";
import { useView } from "./context";
import { DisplaySection } from "./sections/display";
import { LayoutSection } from "./sections/layout";
import { SortSection } from "./sections/sort";
import { ZoomSection } from "./sections/zoom";

function ViewMenu() {
  const { state } = useView();
  const [saveOpen, setSaveOpen] = useState(false);

  return (
    <>
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
              <Menu.Item
                disabled={state.query.clauses.length === 0}
                onClick={() => setSaveOpen(true)}
              >
                <Menu.ItemIcon>
                  <FolderPlus width="14" height="14" />
                </Menu.ItemIcon>
                <Menu.ItemLabel>Save filter as smart folder</Menu.ItemLabel>
              </Menu.Item>
              <RestoreDefaults />
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      <SaveSmartFolderDialog
        query={state.query}
        open={saveOpen}
        onOpenChange={setSaveOpen}
      />
    </>
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
