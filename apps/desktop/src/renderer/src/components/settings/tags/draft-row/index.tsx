import { IconFolderFill18 as Folder } from "@pond/icons/fill/18";
import { useDataTable } from "@pond/ui";
import { focusInput } from "../lib/helpers";
import type { TagsRowData } from "../lib/types";
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
  const { meta } = useDataTable<TagsRowData>();
  return (
    <div
      className={styles["draft-row"]}
      style={{ gridTemplateColumns: meta.gridTemplate }}
      data-group={creating === "group" || undefined}
    >
      {meta.selectionEnabled ? <div /> : null}
      {meta.expansionEnabled ? <div /> : null}
      <div className={styles["name-cell"]}>
        <span className={styles.name}>
          {creating === "group" ? (
            <span className={styles["dot-slot"]}>
              <Folder />
            </span>
          ) : null}
          <input
            ref={focusInput}
            className={styles.input}
            value={draft}
            spellCheck={false}
            placeholder={creating === "group" ? "Group name" : "Label name"}
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
        </span>
      </div>
    </div>
  );
}
