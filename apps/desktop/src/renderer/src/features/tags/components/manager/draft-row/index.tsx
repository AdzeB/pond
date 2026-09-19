import { InlineNameEditor } from "@/shared/components/inline-name-editor";
import styles from "./styles.module.css";

interface DraftRowProps {
  creating: "tag" | "group";
  onSave: (name: string) => Promise<void>;
  onFinish: () => void;
}

export function DraftRow({ creating, onSave, onFinish }: DraftRowProps) {
  return (
    <div className={styles["draft-row"]}>
      <InlineNameEditor
        name=""
        empty="cancel"
        className={styles.input}
        placeholder={creating === "group" ? "Group name" : "Tag name"}
        ariaLabel={creating === "group" ? "Group name" : "Tag name"}
        errorTitle="Couldn't create. Try again."
        onSave={onSave}
        onFinish={onFinish}
      />
    </div>
  );
}
