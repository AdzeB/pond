import { IconPlusOutline12 as Plus } from "@pond/icons/outline/12";
import { useMemo } from "react";
import { TagsEditor } from "@/components/save/preview";
import { setSaveTags } from "@/lib/save/mutate";
import type { Save } from "@/lib/types";
import { mergeUniqueTags } from "@/stores/tag-clipboard";
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
    <TagsEditor save={save}>
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
