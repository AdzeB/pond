import { normalizeLabelName } from "@pond/schema/label-name";
import type { MenuItemSpec } from "@pond/ui";
import { useHotkey } from "@tanstack/react-hotkeys";
import {
  createContext,
  type ReactNode,
  type RefObject,
  use,
  useRef,
  useState,
} from "react";
import { confirm } from "@/components/shared/confirm-dialog";
import {
  buildTagMenuItems,
  type TagMenuActions,
} from "@/components/tags/context-menu";
import {
  buildTagGroupMenuItems,
  type TagGroupMenuActions,
} from "@/components/tags/group-context-menu";
import { SHORTCUTS } from "@/lib/save/shortcuts";
import { getAppRouter } from "@/lib/ui/app-router";
import { libraryChrome } from "@/stores/library-chrome";
import { resetFilters } from "@/stores/view-store";
import { useTagsTable } from "./context";
import type { TagsRowData } from "./types";

interface TagRowContextValue {
  row: TagsRowData;
  rowRef: RefObject<HTMLDivElement | null>;
  renaming: boolean;
  renameDraft: string;
  setRenameDraft: (v: string) => void;
  commitRename: () => void;
  cancelRename: () => void;
  startRename: () => void;
  menuItems: MenuItemSpec[];
  buildMenuItems: () => MenuItemSpec[];
}

const TagRowContext = createContext<TagRowContextValue | null>(null);

export function useTagRow(): TagRowContextValue {
  const ctx = use(TagRowContext);
  if (!ctx) throw new Error("Tag cell must be used within TagRowContext");
  return ctx;
}

export function TagRowProvider({
  row,
  children,
}: {
  row: TagsRowData;
  children: ReactNode;
}) {
  const { groups } = useTagsTable();
  const isGroup = row.kind === "group";
  const name = isGroup ? row.group.name : row.tag.name;

  const [renaming, setRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState(name);
  const rowRef = useRef<HTMLDivElement | null>(null);

  function startRename() {
    setRenameDraft(name);
    setRenaming(true);
  }

  useHotkey(SHORTCUTS["tags.rename"].keys!, () => startRename(), {
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

  function confirmDelete() {
    if (isGroup) {
      confirm({
        title: "Remove Tag Group",
        description: `"${name}" will be removed. The tags inside it stay in your library; they won't belong to this group anymore.`,
        confirmLabel: "Remove",
        onConfirm: () => void window.pond.query("tagGroups.delete", { name }),
      });
      return;
    }
    confirm({
      title: "Remove Tag",
      description: `"${name}" will be removed from every save. This cannot be undone.`,
      confirmLabel: "Remove",
      onConfirm: () => void window.pond.query("tags.delete", { name }),
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
      starred: row.kind === "tag" && row.tag.starred,
      onFilter: () => {
        resetFilters();
        libraryChrome.setNav({ kind: "tag", name });
        getAppRouter()?.history.push("/");
      },
      onSetStarred: (starred) =>
        void window.pond.query("tags.update", {
          name,
          patch: { starred },
        }),
      onAddToGroup: (g) =>
        void window.pond.query("tagGroups.addTags", { tags: [name], group: g }),
      onMoveToGroup: (g) => {
        if (!inGroup || inGroup === g) return;
        void (async () => {
          await window.pond.query("tagGroups.addTags", {
            tags: [name],
            group: g,
          });
          await window.pond.query("tagGroups.removeTag", {
            tag: name,
            group: inGroup,
          });
        })();
      },
      onRemoveFromGroup: () => {
        if (!inGroup) return;
        void window.pond.query("tagGroups.removeTag", {
          tag: name,
          group: inGroup,
        });
      },
      onRename: startRename,
      onRemove: confirmDelete,
    };
    return buildTagMenuItems(actions);
  }

  const value: TagRowContextValue = {
    row,
    rowRef,
    renaming,
    renameDraft,
    setRenameDraft,
    commitRename: () => void commitRename(),
    cancelRename: () => setRenaming(false),
    startRename,
    menuItems: buildMenuItems(),
    buildMenuItems,
  };

  return <TagRowContext value={value}>{children}</TagRowContext>;
}
