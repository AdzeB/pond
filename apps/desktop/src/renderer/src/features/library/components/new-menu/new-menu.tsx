import {
  IconClone2Outline18,
  IconDownloadOutline18,
  IconEyeOutline18,
  IconFileOutline18,
  IconFolderOpenOutline18,
  IconFolderOutline18,
  IconGlobeOutline18,
  IconImageOutline18,
  IconLink2Outline18,
  IconNotepadOutline18,
  IconPlusOutline18,
  IconTagsOutline18,
  IconUserPlusOutline18,
  IconVersionsOutline18,
} from "@pond/icons/outline/18";
import { Dialog, Menu, Tooltip } from "@pond/ui";
import { type ComponentType, Fragment, useState } from "react";
import { pickWatchedFolder } from "@/features/sources/lib/watched-folder";
import { useScrollFade } from "@/shared/hooks/use-scroll-fade";
import {
  importBookmarks,
  importClipboard,
  importEagle,
  importPageAssets,
  importPaths,
  newFolder,
  newSource,
  newTag,
  runNewAction,
} from "./actions";
import styles from "./new-menu.module.css";
import { filterNewActions, type NewActionId } from "./options";
import { SaveDialog } from "./save-dialog/save-dialog";

const ICONS = {
  folder: IconFolderOutline18,
  tag: IconTagsOutline18,
  "tag-group": IconVersionsOutline18,
  note: IconNotepadOutline18,
  files: IconFileOutline18,
  folders: IconFolderOpenOutline18,
  links: IconLink2Outline18,
  clipboard: IconClone2Outline18,
  bookmarks: IconGlobeOutline18,
  "page-assets": IconImageOutline18,
  eagle: IconDownloadOutline18,
  connect: IconUserPlusOutline18,
  watch: IconEyeOutline18,
  "watched-folder": IconFolderOpenOutline18,
} satisfies Record<NewActionId, ComponentType>;

const IMPORT_IDS: ReadonlySet<NewActionId> = new Set([
  "files",
  "folders",
  "clipboard",
  "bookmarks",
  "page-assets",
  "eagle",
]);

export function NewMenu({
  onNewFolder = newFolder,
}: {
  onNewFolder?: typeof newFolder;
} = {}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<"note" | "links" | null>(null);
  const [pending, setPending] = useState<NewActionId | null>(null);
  const scrollFade = useScrollFade<HTMLDivElement>();
  const groups = filterNewActions(search);

  function select(id: NewActionId) {
    setOpen(false);
    switch (id) {
      case "folder":
        onNewFolder();
        return;
      case "tag":
      case "tag-group":
        newTag(id);
        return;
      case "note":
      case "links":
        setDialog(id);
        return;
      case "page-assets":
        Dialog.prompt({
          title: "Import Page Assets",
          confirmLabel: "Import",
          placeholder: "https://",
          onConfirm: (url) => void runNewAction(() => importPageAssets(url)),
        });
        return;
      case "bookmarks":
        if (pending) return;
        setPending(id);
        void runNewAction(importBookmarks).finally(() => setPending(null));
        return;
      case "connect":
      case "watch":
        newSource(id);
        return;
      case "watched-folder":
        void runNewAction(pickWatchedFolder);
        return;
      default:
        if (pending) return;
        setPending(id);
        void runNewAction(() =>
          id === "eagle"
            ? importEagle()
            : id === "clipboard"
              ? importClipboard()
              : importPaths(id),
        ).finally(() => setPending(null));
    }
  }

  return (
    <>
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
                {groups.map((group, index) => (
                  <Fragment key={group.label}>
                    {index > 0 ? <Menu.Separator /> : null}
                    <Menu.Group>
                      <Menu.GroupLabel>{group.label}</Menu.GroupLabel>
                      {group.actions.map((action) => {
                        const Icon = ICONS[action.id];
                        return (
                          <Menu.Item
                            key={action.id}
                            disabled={!!pending && IMPORT_IDS.has(action.id)}
                            onClick={() => select(action.id)}
                          >
                            <Menu.ItemIcon>
                              <Icon />
                            </Menu.ItemIcon>
                            <Menu.ItemLabel>
                              {pending === action.id
                                ? "Importing"
                                : action.label}
                            </Menu.ItemLabel>
                          </Menu.Item>
                        );
                      })}
                    </Menu.Group>
                  </Fragment>
                ))}
                {groups.length === 0 ? (
                  <Menu.Item disabled>
                    <Menu.ItemLabel>No matches</Menu.ItemLabel>
                  </Menu.Item>
                ) : null}
              </div>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      {dialog ? (
        <SaveDialog kind={dialog} onClose={() => setDialog(null)} />
      ) : null}
    </>
  );
}
