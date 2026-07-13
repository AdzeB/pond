// biome-ignore-all lint/a11y/noStaticElementInteractions: row already has role="row" from the DataTable primitive.
// biome-ignore-all lint/a11y/useKeyWithClickEvents: context menu is keyboard-reachable via the actions kebab.

import { normalizeLabelName } from "@pond/schema/label-name";
import type { MenuItemSpec, RenderRowArgs } from "@pond/ui";
import { createContext, use, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PromptDialog } from "@/components/prompt-dialog";
import {
  buildTagMenuItems,
  type TagMenuActions,
} from "@/components/tag-context-menu";
import {
  buildTagGroupMenuItems,
  type TagGroupMenuActions,
} from "@/components/tag-group-context-menu";
import {
  type NativeMenuItem,
  showContextMenu,
  toMenuSpecs,
} from "@/lib/ui/native-menu";
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
  const [merging, setMerging] = useState(false);
  const [mergeTarget, setMergeTarget] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmConvert, setConfirmConvert] = useState(false);

  function startRename() {
    setRenameDraft(name);
    setRenaming(true);
  }

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

  async function commitMerge() {
    const target = normalizeLabelName(mergeTarget);
    setMerging(false);
    setMergeTarget("");
    if (!target || target.toLowerCase() === name.toLowerCase()) return;
    await window.pond.query("tags.merge", { from: name, to: target });
  }

  function setColor(color: string | null) {
    void window.pond.query(isGroup ? "tagGroups.update" : "tags.update", {
      name,
      patch: { color },
    });
  }

  function buildMenuItems(): NativeMenuItem[] {
    if (isGroup) {
      const actions: TagGroupMenuActions = {
        onRename: startRename,
        onRequestDelete: () => setConfirmDelete(true),
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
      onConvertToGroup: () => setConfirmConvert(true),
      onMerge: () => {
        setMergeTarget("");
        setMerging(true);
      },
      onDelete: () => setConfirmDelete(true),
    };
    return buildTagMenuItems(actions);
  }

  const nativeItems = buildMenuItems();

  const value: TagRowContextValue = {
    row,
    renaming,
    renameDraft,
    setRenameDraft,
    commitRename: () => void commitRename(),
    cancelRename: () => setRenaming(false),
    setColor,
    menuItems: toMenuSpecs(nativeItems),
  };

  return (
    <TagRowContext value={value}>
      <div
        {...rowProps}
        title={name}
        onContextMenu={(e) => {
          e.preventDefault();
          void showContextMenu(nativeItems);
        }}
      >
        {cells}
      </div>

      {isGroup ? (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Remove tag group?"
          description={`"${name}" will be removed. The tags inside it stay in your library; they just won't belong to this group anymore.`}
          confirmLabel="Remove"
          onConfirm={() => {
            void window.pond.query("tagGroups.delete", { name });
            setConfirmDelete(false);
          }}
        />
      ) : (
        <>
          <PromptDialog
            open={merging}
            onOpenChange={setMerging}
            title={`Merge "${name}" into…`}
            description={`Every save tagged "${name}" will be re-tagged with the target, and "${name}" will be removed.`}
            value={mergeTarget}
            onValueChange={setMergeTarget}
            onConfirm={() => void commitMerge()}
            confirmLabel="Merge"
            placeholder="Target tag name"
          />
          <ConfirmDialog
            open={confirmDelete}
            onOpenChange={setConfirmDelete}
            title="Delete tag?"
            description={`"${name}" will be removed from every save. This cannot be undone.`}
            confirmLabel="Delete"
            onConfirm={() => {
              void window.pond.query("tags.delete", { name });
              setConfirmDelete(false);
            }}
          />
          <ConfirmDialog
            open={confirmConvert}
            onOpenChange={setConfirmConvert}
            title="Convert to group?"
            description={`"${name}" will become a label group. It can no longer be applied to saves directly, and the label will be removed from every save it's on.`}
            confirmLabel="Convert"
            onConfirm={() => {
              void window.pond.query("tags.convertToGroup", { name });
              setConfirmConvert(false);
            }}
          />
        </>
      )}
    </TagRowContext>
  );
}
