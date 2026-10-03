import { IconPlusOutline18 } from "@pond/icons/outline/18";
import { Menu, Tooltip } from "@pond/ui";
import { useEffect, useState } from "react";
import {
  blankDocuments,
  useBlankDocuments,
} from "@/features/library/state/blank-documents";
import {
  newMenuDialog,
  useNewMenuDialog,
} from "@/features/library/state/new-menu-dialog";
import { useRetainedDialogPayload } from "@/shared/hooks/use-retained-dialog-payload";
import { LibraryRepairDialog } from "../repair-dialog";
import { ScreenshotOrganizeDialog } from "../screenshot-organize";
import { SaveDialog } from "./save-dialog";
import { ScreenshotDialog } from "./screenshot-dialog";
import { buildNewMenuItems, filterMenuItems } from "./spec";
import styles from "./styles.module.css";

export function NewMenu() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const documents = useBlankDocuments();
  const items = filterMenuItems(
    buildNewMenuItems(documents.kinds, documents.icons),
    search,
  );

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
            <Menu.List>
              {items.length > 0 ? (
                <Menu.Items items={items} />
              ) : (
                <Menu.Item disabled>
                  <Menu.ItemLabel>No matches</Menu.ItemLabel>
                </Menu.Item>
              )}
            </Menu.List>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

export function NewMenuDialogHost() {
  const dialog = useNewMenuDialog();
  const presentation = useRetainedDialogPayload(dialog);
  useEffect(() => {
    void blankDocuments.refresh();
  }, []);
  const kind = presentation.payload;
  if (kind?.kind === "screenshot-organize") {
    return (
      <ScreenshotOrganizeDialog
        key={kind.draft.token}
        draft={kind.draft}
        open={presentation.open}
        onClose={() => newMenuDialog.close()}
      />
    );
  }
  if (kind?.kind === "links") {
    return (
      <SaveDialog
        open={presentation.open}
        onClose={() => newMenuDialog.close()}
      />
    );
  }
  if (kind?.kind === "screenshot") {
    return (
      <ScreenshotDialog
        open={presentation.open}
        onClose={() => newMenuDialog.close()}
      />
    );
  }
  if (kind?.kind === "repair") {
    return (
      <LibraryRepairDialog
        kind={kind.repair}
        open={presentation.open}
        onClose={() => newMenuDialog.close()}
      />
    );
  }
  return null;
}
