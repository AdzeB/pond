import { IconPlusOutline12 as Plus } from "@pond/icons/outline/12";
import {
  IconBarsFilterOutline18,
  IconClipboardOutline18,
  IconMinusOutline18,
  IconPencilOutline18,
  IconTagsOutline18,
  IconTrash2Outline18,
} from "@pond/icons/outline/18";
import { Dialog, type MenuItemSpec } from "@pond/ui";
import { useCallback, useRef, useState } from "react";
import { copyTags, pasteTags } from "@/features/saves/lib/actions";
import { saveLibraryBridge } from "@/features/saves/lib/library-bridge";
import { setSaveTags } from "@/features/saves/lib/mutate";
import { closeSave } from "@/features/saves/lib/save-nav";
import type { Save } from "@/features/saves/types";
import { TagPicker } from "@/features/tags/components/picker/picker";
import { tagOperations } from "@/features/tags/operations/tag-client";
import { tagClipboard } from "@/features/tags/state/tag-clipboard";
import { SpecContextMenu } from "@/shared/components/spec-context-menu/spec-context-menu";
import { getAppRouter } from "@/shared/lib/app-router";
import styles from "./styles.module.css";

function filterByTag(tag: string): void {
  saveLibraryBridge.resetFilters();
  saveLibraryBridge.setNav({ kind: "tag", name: tag });
  getAppRouter()?.history.push("/");
  closeSave();
}

function renameTag(tag: string): void {
  Dialog.prompt({
    title: "Rename Tag",
    initialValue: tag,
    confirmLabel: "Rename",
    onConfirm: (next) => tagOperations.rename("tag", tag, next),
  });
}

export function buildTagPillMenu(
  save: Save,
  tag: string,
  remove: (name: string) => Promise<void>,
): MenuItemSpec[] {
  return [
    {
      label: "Filter Items with the Tag(s)",
      icon: <IconBarsFilterOutline18 />,
      onClick: () => filterByTag(tag),
    },
    {
      label: "Rename Tag",
      icon: <IconPencilOutline18 />,
      onClick: () => renameTag(tag),
    },
    {
      label: "Copy Tags",
      icon: <IconTagsOutline18 />,
      onClick: () => copyTags(save),
    },
    {
      label: "Paste Tags",
      icon: <IconClipboardOutline18 />,
      disabled: tagClipboard.get().length === 0,
      onClick: () => void pasteTags(save),
    },
    { type: "separator" },
    {
      label: "Remove from Save",
      icon: <IconMinusOutline18 />,
      onClick: () => void remove(tag),
    },
  ];
}

export function buildEmptyTagFieldMenu(save: Save): MenuItemSpec[] {
  return [
    {
      label: "Copy Tags",
      icon: <IconTagsOutline18 />,
      hidden: save.tags.length === 0,
      onClick: () => copyTags(save),
    },
    {
      label: "Paste Tags",
      icon: <IconClipboardOutline18 />,
      disabled: tagClipboard.get().length === 0,
      onClick: () => void pasteTags(save),
    },
    {
      label: "Clear All Tags",
      icon: <IconTrash2Outline18 />,
      hidden: save.tags.length === 0,
      onClick: () => void setSaveTags(save.id, []),
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
      <SpecContextMenu
        buildItems={() => buildEmptyTagFieldMenu(save)}
        onOpen={(eventDetails) => {
          const target = eventDetails.event?.target;
          if (
            target instanceof Element &&
            target.closest("[data-tag], [data-tag-add]")
          ) {
            eventDetails.cancel();
          }
        }}
      >
        <div ref={listRef} className={styles.tags}>
          {save.tags.map((tag) => (
            <SpecContextMenu
              key={tag}
              buildItems={() => buildTagPillMenu(save, tag, remove)}
            >
              <button
                type="button"
                className={styles.tag}
                data-tag=""
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
        </div>
      </SpecContextMenu>
      <TagPicker.Content
        anchor={() => listRef.current}
        side="bottom"
        align="start"
        sideOffset={8}
      />
    </TagPicker.Root>
  );
}
