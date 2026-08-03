import {
  IconPlusOutline18 as Plus,
  IconXmarkOutline18 as X,
} from "@pond/icons/outline/18";
import type { MenuItemSpec } from "@pond/ui";
import { useCallback, useMemo, useState } from "react";
import { SpecContextMenu } from "@/components/shared/spec-context-menu";
import { TagPicker } from "@/components/tags/picker";
import { setSaveTags } from "@/lib/save/mutate";
import { colorForName } from "@/lib/tags/color";
import type { Save } from "@/lib/types";
import { closeSave } from "@/lib/ui/save-nav";
import { useTags } from "@/stores/tags";
import { setSearchInput } from "@/stores/view-store";
import styles from "./styles.module.css";

/** Quick actions only; full tag management stays in settings. */
function buildTagPillMenu(
  tag: string,
  remove: (name: string) => Promise<void>,
): MenuItemSpec[] {
  return [
    {
      label: "Search Tag",
      onClick: () => {
        setSearchInput([{ field: "tags", operator: "some", value: [tag] }], "");
        closeSave();
      },
    },
    {
      label: "Copy Tag Name",
      onClick: () => {
        navigator.clipboard.writeText(tag).catch(() => {
          /** Clipboard unavailable; drop silently. */
        });
      },
    },
    { type: "separator" },
    {
      label: "Remove from Save",
      onClick: () => void remove(tag),
    },
  ];
}

export function TagsEditor({ save }: { save: Save }) {
  const [busy, setBusy] = useState(false);
  const catalog = useTags();

  const colorByName = useMemo(() => {
    const map = new Map<string, string>();
    for (const tag of catalog) {
      map.set(tag.name.toLowerCase(), tag.color ?? colorForName(tag.name));
    }
    return map;
  }, [catalog]);

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
        <SpecContextMenu
          key={tag}
          buildItems={() => buildTagPillMenu(tag, remove)}
        >
          <span className={styles["pane-tag"]}>
            <span
              className={styles["pane-tag-dot"]}
              style={{
                background:
                  colorByName.get(tag.toLowerCase()) ?? colorForName(tag),
              }}
              aria-hidden
            />
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
        </SpecContextMenu>
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
              <Plus width={12} height={12} />
            </button>
          }
        />
        <TagPicker.Content side="left" align="start" sideOffset={6} />
      </TagPicker.Root>
    </div>
  );
}
