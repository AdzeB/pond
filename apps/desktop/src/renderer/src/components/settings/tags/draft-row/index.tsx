import { focusInput } from "../lib/helpers";
import styles from "./styles.module.css";

interface DraftRowProps {
  creating: "tag" | "group";
  draft: string;
  setDraft: (v: string) => void;
  onCommit: () => void;
  onCancel: () => void;
}

export function DraftRow({
  creating,
  draft,
  setDraft,
  onCommit,
  onCancel,
}: DraftRowProps) {
  return (
    <div className={styles["draft-row"]}>
      <input
        ref={focusInput}
        className={styles.input}
        value={draft}
        spellCheck={false}
        placeholder={creating === "group" ? "Group name" : "Tag name"}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={onCommit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onCommit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
      />
    </div>
  );
}
