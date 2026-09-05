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
import { libraryChrome } from "@/features/library/state/library-chrome";
import { resetFilters } from "@/features/library/state/view-store";
import {
  buildTagMenuItems,
  type TagMenuActions,
} from "@/features/tags/components/context-menu/context-menu";
import {
  buildTagGroupMenuItems,
  type TagGroupMenuActions,
} from "@/features/tags/components/group-context-menu/group-context-menu";
import { tagOperations } from "@/features/tags/operations/tag-client";
import { confirm } from "@/shared/components/confirm-dialog/confirm-dialog";
import { getAppRouter } from "@/shared/lib/app-router";
import { SHORTCUTS } from "@/shared/lib/shortcuts";
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
    await tagOperations.rename(isGroup ? "group" : "tag", name, renameDraft);
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
        void tagOperations.moveToGroup(name, inGroup, g);
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
