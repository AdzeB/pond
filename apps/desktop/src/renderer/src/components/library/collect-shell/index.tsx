import type { Folder } from "@pond/schema/db";
import { Button, Field, Input, Menu } from "@pond/ui";
import { useEffect, useState } from "react";
import styles from "./styles.module.css";

export function CollectShell() {
  const [tags, setTags] = useState("");
  const [folderId, setFolderId] = useState("");
  const [folders, setFolders] = useState<Folder[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void window.pond.query("folders.list", {}).then((rows) => {
      setFolders((rows as Folder[]) ?? []);
    });
  }, []);

  const folderName =
    folders.find((folder) => folder.id === folderId)?.name ?? "Library";

  const ingest = async (paths: string[]) => {
    if (paths.length === 0) return;
    setBusy(true);
    try {
      const tagList = tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
      await window.pond.query("saves.importFiles", {
        paths,
        tags: tagList,
        folderIds: folderId ? [folderId] : [],
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.root}>
      <h1 className={styles.title}>Collection Window</h1>
      <p className={styles.copy}>
        Drop files here to save them to your library.
      </p>
      <div className={styles.fields}>
        <Field.Root>
          <Field.Label>Folder</Field.Label>
          <Menu.Root>
            <Menu.Trigger size="sm" variant="secondary">
              {folderName}
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner>
                <Menu.Popup>
                  <Menu.Item onClick={() => setFolderId("")}>
                    <Menu.ItemLabel>Library</Menu.ItemLabel>
                  </Menu.Item>
                  {folders.map((folder) => (
                    <Menu.Item
                      key={folder.id}
                      onClick={() => setFolderId(folder.id)}
                    >
                      <Menu.ItemLabel>{folder.name}</Menu.ItemLabel>
                    </Menu.Item>
                  ))}
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        </Field.Root>
        <Field.Root>
          <Field.Label>Tags</Field.Label>
          <Input.Root size="sm">
            <Input.Field
              value={tags}
              placeholder="design, reference"
              onValueChange={setTags}
            />
          </Input.Root>
        </Field.Root>
      </div>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: drop target for local files */}
      <div
        className={styles.drop}
        data-busy={busy || undefined}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const paths = [...event.dataTransfer.files]
            .map((file) => (file as File & { path?: string }).path)
            .filter((path): path is string => Boolean(path));
          void ingest(paths);
        }}
      >
        {busy ? "Saving" : "Drop files"}
      </div>
      <div className={styles.actions}>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => void window.pond.query("capture.display", {})}
        >
          Screenshot Display
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => void window.pond.query("capture.selectArea", {})}
        >
          Screenshot Area
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => void window.pond.query("capture.window", {})}
        >
          Screenshot Window
        </Button>
      </div>
    </div>
  );
}
