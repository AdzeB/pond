import {
  IconPlusOutline18 as Plus,
  IconTagsOutline18 as TagsIcon,
} from "@pond/icons/outline/18";
import { useMemo } from "react";
import { Section } from "@/components/save-detail-section";
import { TagsEditor } from "@/components/save-preview";
import { setSaveTags } from "@/lib/save/mutate";
import type { Save } from "@/lib/types";
import { mergeUniqueTags } from "@/stores/tag-clipboard";
import styles from "./styles.module.css";

export function TagsSection({ save }: { save: Save }) {
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
    <Section icon={<TagsIcon width={16} height={16} />} title="Tags">
      <div className={styles.tags}>
        <TagsEditor save={save} />
      </div>
      {suggested.length > 0 ? (
        <div className={styles.tags}>
          {suggested.map((tag) => (
            <button
              key={tag}
              type="button"
              className={styles.chipAdd}
              aria-label={`Add tag ${tag}`}
              onClick={() => void addTag(tag)}
            >
              {tag}
              <Plus width={8} height={8} className={styles.chipAddIcon} />
            </button>
          ))}
        </div>
      ) : null}
    </Section>
  );
}
