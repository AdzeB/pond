import { Button, Dialog } from "@pond/ui";
import { useState } from "react";
import {
  newMenuDialog,
  openFolderPicker,
  useFolders,
} from "@/features/library";
import { FolderToolsDialog } from "@/features/library/folder-tools";
import { useSaves } from "@/features/saves/pool";
import styles from "./styles.module.css";

type LocalDialog = "folder-tags";

export function DialogGalleryPage() {
  const folders = useFolders();
  const saves = useSaves();
  const [local, setLocal] = useState<LocalDialog | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string | null>(null);
  const folder = folders[0];
  const save = saves[0];
  const close = () => setLocal(null);
  const needsFolder = "Add a folder to open this dialog.";
  const needsSave = "Add a save to open this dialog.";

  const sections = [
    {
      title: "Library",
      entries: [
        {
          title: "Move Library",
          open: () =>
            Dialog.confirm({
              title: "Move Library",
              description:
                "Pond will verify the new copy before removing the library from its current location.",
              confirmLabel: "Move",
              onConfirm: () => {},
            }),
        },
        {
          title: "Import Page Assets",
          open: () =>
            Dialog.prompt({
              title: "Import Page Assets",
              description:
                "Pond saves the images and files from the page you enter.",
              confirmLabel: "Import",
              placeholder: "https://",
              onConfirm: () => {},
            }),
        },
        {
          title: "Import from Links",
          open: () => newMenuDialog.open({ kind: "links" }),
        },
        {
          title: "Assign Folders",
          detail: save ? undefined : needsSave,
          open: () => save && openFolderPicker([save.id]),
        },
        {
          title: "Automatic Tags",
          detail: folder ? undefined : needsFolder,
          open: () => folder && setLocal("folder-tags"),
        },
        {
          title: "Remove Folder",
          detail: folder ? undefined : needsFolder,
          open: () =>
            folder &&
            Dialog.confirm({
              title: "Remove Folder",
              description:
                "Saves stay in the Library and move to Uncategorized unless you select the option below.",
              confirmLabel: "Remove",
              confirmVariant: "destructive",
              checkbox: {
                label: "Move Saves in this folder and its subfolders to Trash",
              },
              onConfirm: () => {},
            }),
        },
      ],
    },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Dialog Gallery</h1>
        <p className={styles.summary}>
          Select a dialog to inspect the production component inside the preview
          frame. Cancel closes it.
        </p>
      </header>
      <div className={styles.scroll}>
        <div className={styles.layout}>
          <div className={styles.catalog}>
            {sections.map((group) => (
              <section className={styles.group} key={group.title}>
                <h2 className={styles["group-title"]}>{group.title}</h2>
                <div className={styles.list}>
                  {group.entries.map((entry) => (
                    <div className={styles.item} key={entry.title}>
                      <Button
                        variant="secondary"
                        disabled={Boolean(entry.detail)}
                        onClick={() => {
                          setPreviewTitle(entry.title);
                          entry.open();
                        }}
                      >
                        {entry.title}
                      </Button>
                      {entry.detail ? (
                        <p className={styles.detail}>{entry.detail}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
          <aside className={styles.preview} aria-label="Dialog preview">
            <div className={styles["preview-header"]}>
              <div>
                <span className={styles["preview-label"]}>Preview</span>
                <h2>{previewTitle ?? "Choose a dialog"}</h2>
              </div>
              <span className={styles["preview-status"]} aria-live="polite">
                {previewTitle
                  ? "Production component"
                  : "Waiting for selection"}
              </span>
            </div>
            <Dialog.PortalTarget className={styles["preview-frame"]}>
              <div className={styles["preview-empty"]}>
                <strong>Dialog canvas</strong>
                <p>
                  Choose an available dialog from the catalog to render it here.
                </p>
              </div>
            </Dialog.PortalTarget>
          </aside>
        </div>
      </div>
      {folder && local === "folder-tags" ? (
        <FolderToolsDialog
          tool={{
            kind: "tags",
            id: folder.id,
            name: folder.name,
          }}
          onClose={close}
        />
      ) : null}
    </div>
  );
}
