import { IconPlusOutline18 } from "@pond/icons/outline/18";
import { Menu, Tooltip } from "@pond/ui";
import { useEffect, useState } from "react";
import {
  blankDocuments,
  useBlankDocumentKinds,
} from "@/features/library/state/blank-documents";
import {
  newMenuDialog,
  useNewMenuDialog,
} from "@/features/library/state/new-menu-dialog";
import { useScrollFade } from "@/shared/hooks/use-scroll-fade";
import styles from "./new-menu.module.css";
import { SaveDialog } from "./save-dialog/save-dialog";
import { buildNewMenuItems, filterMenuItems } from "./spec";

export function NewMenu() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const scrollFade = useScrollFade<HTMLDivElement>();
  const installed = useBlankDocumentKinds();
  const items = filterMenuItems(buildNewMenuItems(installed), search);

  useEffect(() => {
    if (open) void blankDocuments.refresh();
  }, [open]);

  return (
    <Menu.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setSearch("");
      }}
    >
      <Tooltip label="New" side="bottom">
        <Menu.Trigger icon size="sm" variant="ghost" aria-label="New">
          <IconPlusOutline18 />
        </Menu.Trigger>
      </Tooltip>
      <Menu.Portal>
        <Menu.Positioner align="start" side="bottom">
          <Menu.Popup className={styles.popup}>
            <Menu.Input
              autoFocus
              aria-label="Search Actions"
              placeholder="Search…"
              value={search}
              onValueChange={setSearch}
            />
            <div className={styles.options} {...scrollFade}>
              {items.length > 0 ? (
                <Menu.Items items={items} />
              ) : (
                <Menu.Item disabled>
                  <Menu.ItemLabel>No matches</Menu.ItemLabel>
                </Menu.Item>
              )}
            </div>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

export function NewMenuDialogHost() {
  const dialog = useNewMenuDialog();
  useEffect(() => {
    void blankDocuments.refresh();
  }, []);
  return dialog ? <SaveDialog onClose={() => newMenuDialog.close()} /> : null;
}
