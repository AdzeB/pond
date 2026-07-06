import {
  IconPlusOutline18 as Plus,
  IconXmarkOutline18 as X,
} from "@pond/icons/outline/18";
import { useCallback, useState } from "react";
import { TagPicker } from "@/components/tag-picker";
import { setSaveTags } from "@/lib/save/mutate";
import type { Save } from "@/lib/types";
import styles from "./styles.module.css";

export function TagsEditor({ save }: { save: Save }) {
  const [busy, setBusy] = useState(false);

  const remove = useCallback(
    async (name: string) => {
      setBusy(true);
      try {
        await setSaveTags(
          save.id,
          save.tags.filter((t) => t.toLowerCase() !== name.toLowerCase()),
        );
      } finally {
        setBusy(false);
      }
    },
    [save.id, save.tags],
  );

  return (
    <div className={styles["pane-tags"]}>
      {save.tags.map((tag) => (
        <span key={tag} className={styles["pane-tag"]}>
          <span className={styles["pane-tag-label"]}>{tag}</span>
          <button
            type="button"
            className={styles["pane-tag-remove"]}
            onClick={() => void remove(tag)}
            aria-label={`Remove tag ${tag}`}
            disabled={busy}
          >
            <X width={10} height={10} />
          </button>
        </span>
      ))}
      <TagPicker.Root target={{ kind: "save", save }}>
        <TagPicker.Trigger
          render={
            <button
              type="button"
              className={styles["pane-tag-add"]}
              aria-label="Add tag"
              data-tag-add
            >
              <Plus width={10} height={10} />
            </button>
          }
        />
        <TagPicker.Content side="left" align="start" sideOffset={6} />
      </TagPicker.Root>
    </div>
  );
}
