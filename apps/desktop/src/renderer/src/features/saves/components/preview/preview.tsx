import { IconPlusOutline12 as Plus } from "@pond/icons/outline/12";
import type { MenuItemSpec } from "@pond/ui";
import { useCallback, useRef, useState } from "react";
import { setSearchInput } from "@/features/library/state/view-store";
import { setSaveTags } from "@/features/saves/lib/mutate";
import { closeSave } from "@/features/saves/lib/save-nav";
import type { Save } from "@/features/saves/types";
import { TagPicker } from "@/features/tags/components/picker/picker";
import { SpecContextMenu } from "@/shared/components/spec-context-menu/spec-context-menu";
import styles from "./preview.module.css";

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
  addLabel,
}: {
  save: Save;
  children?: React.ReactNode;
  addLabel?: string;
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
        <TagPicker.Trigger
          icon={!addLabel}
          size="xs"
          variant="ghost"
          aria-label="Add Tag"
          data-tag-add=""
        >
          <Plus />
          {addLabel}
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
