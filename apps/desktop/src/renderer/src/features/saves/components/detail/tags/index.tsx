import { IconPlusOutline12 as Plus } from "@pond/icons/outline/12";
import { useMemo } from "react";
import { TagsEditor } from "@/features/saves/components/preview";
import { setSaveTags } from "@/features/saves/lib/mutate";
import type { Save } from "@/features/saves/types";
import { mergeUniqueTags } from "@/features/tags/state/tag-clipboard";
import styles from "./styles.module.css";

export function SaveTags({ save }: { save: Save }) {
  const existing = useMemo(
    () => new Set(save.tags.map((t) => t.toLowerCase())),
    [save.tags],
  );
  const suggested = (save.suggestedTags ?? []).filter(
    (t) => t && !existing.has(t.toLowerCase()),
  );

  const addTag = async (tag: string) => {
    await setSaveTags(save.id, mergeUniqueTags(save.tags, [tag]));
  };

  return (
    <TagsEditor
      save={save}
      addLabel={save.tags.length === 0 ? "Add Tag" : undefined}
    >
      {suggested.map((tag) => (
        <button
          key={tag}
          type="button"
          className={styles.add}
          aria-label={`Add tag ${tag}`}
          onClick={() => void addTag(tag)}
        >
          {tag}
          <Plus className={styles.icon} />
        </button>
      ))}
    </TagsEditor>
  );
}
