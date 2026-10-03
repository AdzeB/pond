import { IconFolderOutline18 } from "@pond/icons/outline/18";
import { Sidebar } from "@pond/ui";
import { InlineNameEditor } from "@/shared/components/inline-name-editor";
import styles from "./styles.module.css";

export function FolderNameEditor({
  name,
  onSave,
  onFinish,
}: {
  name: string;
  onSave: (name: string) => Promise<void>;
  onFinish: () => void;
}) {
  return (
    <div className={styles.editor}>
      <Sidebar.Icon className={styles.icon}>
        <IconFolderOutline18 />
      </Sidebar.Icon>
      <InlineNameEditor
        name={name}
        className={styles.field}
        ariaLabel="Folder name"
        errorTitle="Couldn't rename folder. Try again."
        onSave={onSave}
        onFinish={onFinish}
      />
    </div>
  );
}
