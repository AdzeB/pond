import { IconPlusOutline18 as Plus } from "@pond/icons/outline/18";
import { useMemo } from "react";
import { Section } from "@/components/save-detail-section";
import { TagsEditor } from "@/components/save-preview";
import { setSaveTags } from "@/lib/save/mutate";
import { colorForName } from "@/lib/tags/color";
import type { Save } from "@/lib/types";
import { mergeUniqueTags } from "@/stores/tag-clipboard";
import { useTags } from "@/stores/tags";
import styles from "./styles.module.css";

export function TagsSection({ save }: { save: Save }) {
  const catalog = useTags();
  const existing = useMemo(
    () => new Set(save.tags.map((t) => t.toLowerCase())),
    [save.tags],
  );
  const suggested = (save.suggestedTags ?? []).filter(
    (t) => t && !existing.has(t.toLowerCase()),
  );

  const colorByName = useMemo(() => {
    const map = new Map<string, string>();
    for (const tag of catalog) {
      map.set(tag.name.toLowerCase(), tag.color ?? colorForName(tag.name));
    }
    return map;
  }, [catalog]);

  const addTag = async (tag: string) => {
    await setSaveTags(save.id, mergeUniqueTags(save.tags, [tag]));
  };

  return (
    <Section title="Tags">
      <div className={styles.tags}>
        <TagsEditor save={save} />
      </div>
      {suggested.length > 0 ? (
        <div className={styles.tags}>
          {suggested.map((tag) => (
            <button
              key={tag}
              type="button"
              className={styles["chip-add"]}
              aria-label={`Add tag ${tag}`}
              onClick={() => void addTag(tag)}
            >
              <span
                className={styles["chip-add-dot"]}
                style={{
                  background:
                    colorByName.get(tag.toLowerCase()) ?? colorForName(tag),
                }}
                aria-hidden
              />
              {tag}
              <Plus width={8} height={8} className={styles["chip-add-icon"]} />
            </button>
          ))}
        </div>
      ) : null}
    </Section>
  );
}
