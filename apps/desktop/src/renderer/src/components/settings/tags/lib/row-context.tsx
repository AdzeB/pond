// biome-ignore-all lint/a11y/noStaticElementInteractions: row already has role="row" from the DataTable primitive.
// biome-ignore-all lint/a11y/useKeyWithClickEvents: context menu is keyboard-reachable via the actions kebab.

import { normalizeLabelName } from "@pond/schema/label-name";
import type { MenuItemSpec, RenderRowArgs } from "@pond/ui";
import { useHotkey } from "@tanstack/react-hotkeys";
import { createContext, use, useRef, useState } from "react";
import { confirm } from "@/components/shared/confirm-dialog";
import { prompt } from "@/components/shared/prompt-dialog";
import { SpecContextMenu } from "@/components/shared/spec-context-menu";
import {
  buildTagMenuItems,
  type TagMenuActions,
} from "@/components/tags/context-menu";
import {
  buildTagGroupMenuItems,
  type TagGroupMenuActions,
} from "@/components/tags/group-context-menu";
import { SHORTCUTS } from "@/lib/save/shortcuts";
import { useTagsTable } from "./context";
import type { TagsRowData } from "./types";

interface TagRowContextValue {
  row: TagsRowData;
  renaming: boolean;
  renameDraft: string;
  setRenameDraft: (v: string) => void;
  commitRename: () => void;
  cancelRename: () => void;
  setColor: (color: string | null) => void;
  /** Row actions as `Menu.Items` specs, for the kebab dropdown. */
  menuItems: MenuItemSpec[];
}

const TagRowContext = createContext<TagRowContextValue | null>(null);

export function useTagRow(): TagRowContextValue {
  const ctx = use(TagRowContext);
  if (!ctx) throw new Error("Tag cell must be used within TagRowContext");
  return ctx;
}

/** Owns all per-row interaction state and exposes it to the cell components via context; the primitive hands over the already-rendered `cells`. */
export function TagRow({ row, cells, rowProps }: RenderRowArgs<TagsRowData>) {
  const { groups } = useTagsTable();
  const isGroup = row.kind === "group";
  const name = isGroup ? row.group.name : row.tag.name;

  const [renaming, setRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState(name);
  const rowRef = useRef<HTMLDivElement>(null);

  function startRename() {
    setRenameDraft(name);
    setRenaming(true);
  }

  /** Scoped to the focused row so E only renames the row the user is on. */
  useHotkey(SHORTCUTS["tags.rename"].keys, () => startRename(), {
    target: rowRef,
    enabled: !renaming,
  });

  async function commitRename() {
    setRenaming(false);
    if (isGroup) {
      const cleaned = renameDraft.trim();
      if (!cleaned || cleaned === name) return;
      await window.pond.query("tagGroups.rename", { from: name, to: cleaned });
      return;
    }
    const cleaned = normalizeLabelName(renameDraft);
    if (!cleaned || cleaned.toLowerCase() === name.toLowerCase()) return;
    await window.pond.query("tags.rename", { from: name, to: cleaned });
  }

  async function commitMerge(raw: string) {
    const target = normalizeLabelName(raw);
    if (!target || target.toLowerCase() === name.toLowerCase()) return;
    await window.pond.query("tags.merge", { from: name, to: target });
  }

  function confirmDelete() {
    if (isGroup) {
      confirm({
        title: "Remove tag group?",
        description: `"${name}" will be removed. The tags inside it stay in your library; they just won't belong to this group anymore.`,
        confirmLabel: "Remove",
        onConfirm: () => void window.pond.query("tagGroups.delete", { name }),
      });
      return;
    }
    confirm({
      title: "Delete tag?",
      description: `"${name}" will be removed from every save. This cannot be undone.`,
      confirmLabel: "Delete",
      onConfirm: () => void window.pond.query("tags.delete", { name }),
    });
  }

  function confirmConvert() {
    confirm({
      title: "Convert to group?",
      description: `"${name}" will become a label group. It can no longer be applied to saves directly, and the label will be removed from every save it's on.`,
      confirmLabel: "Convert",
      onConfirm: () => void window.pond.query("tags.convertToGroup", { name }),
    });
  }

  function promptMerge() {
    prompt({
      title: `Merge "${name}"`,
      description: `Every save tagged "${name}" will be re-tagged with the target, and "${name}" will be removed.`,
      confirmLabel: "Merge",
      placeholder: "Target tag name",
      onConfirm: (value) => void commitMerge(value),
    });
  }

  function setColor(color: string | null) {
    void window.pond.query(isGroup ? "tagGroups.update" : "tags.update", {
      name,
      patch: { color },
    });
  }

  function buildMenuItems(): MenuItemSpec[] {
    if (isGroup) {
      const actions: TagGroupMenuActions = {
        onRename: startRename,
        onRequestDelete: confirmDelete,
      };
      return buildTagGroupMenuItems(actions);
    }
    const inGroup = row.kind === "tag" ? row.inGroup : null;
    const actions: TagMenuActions = {
      groups,
      inGroup,
      onAddToGroup: (g) => {
        if (inGroup && inGroup !== g) {
          void window.pond.query("tagGroups.removeTag", {
            tag: name,
            group: inGroup,
          });
        }
        void window.pond.query("tagGroups.addTags", { tags: [name], group: g });
      },
      onRemoveFromGroup: (g) =>
        void window.pond.query("tagGroups.removeTag", { tag: name, group: g }),
      onRename: startRename,
      onConvertToGroup: confirmConvert,
      onMerge: promptMerge,
      onDelete: confirmDelete,
    };
    return buildTagMenuItems(actions);
  }

  const menuItems = buildMenuItems();

  const value: TagRowContextValue = {
    row,
    renaming,
    renameDraft,
    setRenameDraft,
    commitRename: () => void commitRename(),
    cancelRename: () => setRenaming(false),
    setColor,
    menuItems,
  };

  return (
    <TagRowContext value={value}>
      <SpecContextMenu buildItems={buildMenuItems}>
        {/* Focus (via tabIndex -1) scopes the E rename hotkey to the clicked row. */}
        <div {...rowProps} ref={rowRef} title={name} tabIndex={-1}>
          {cells}
        </div>
      </SpecContextMenu>
    </TagRowContext>
  );
}
