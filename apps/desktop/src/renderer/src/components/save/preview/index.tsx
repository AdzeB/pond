import { IconPlusOutline12 as Plus } from "@pond/icons/outline/12";
import type { MenuItemSpec } from "@pond/ui";
import { useCallback, useRef, useState } from "react";
import { SpecContextMenu } from "@/components/shared/spec-context-menu";
import { TagPicker } from "@/components/tags/picker";
import { setSaveTags } from "@/lib/save/mutate";
import type { Save } from "@/lib/types";
import { closeSave } from "@/lib/ui/save-nav";
import { setSearchInput } from "@/stores/view-store";
import styles from "./styles.module.css";

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
        navigator.clipboard.writeText(tag).catch(() => {});
      },
    },
    { type: "separator" },
    {
      label: "Remove from Save",
      onClick: () => void remove(tag),
    },
  ];
}

export function TagsEditor({
  save,
  children,
}: {
  save: Save;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const remove = useCallback(
    async (name: string) => {
      await setSaveTags(
        save.id,
        save.tags.filter((t) => t.toLowerCase() !== name.toLowerCase()),
      );
    },
    [save.id, save.tags],
  );

  return (
    <TagPicker.Root
      target={{ kind: "save", save }}
      open={open}
      onOpenChange={setOpen}
    >
      <div ref={listRef} className={styles.tags}>
        {save.tags.map((tag) => (
          <SpecContextMenu
            key={tag}
            buildItems={() => buildTagPillMenu(tag, remove)}
          >
            <button
              type="button"
              className={styles.tag}
              onClick={() => setOpen(true)}
            >
              <span className={styles.label}>{tag}</span>
            </button>
          </SpecContextMenu>
        ))}
        {children}
        <TagPicker.Trigger icon size="xs" variant="ghost" aria-label="Add Tag">
          <Plus />
        </TagPicker.Trigger>
        <TagPicker.Content
          anchor={() => listRef.current}
          side="bottom"
          align="start"
          sideOffset={8}
        />
      </div>
    </TagPicker.Root>
  );
}
