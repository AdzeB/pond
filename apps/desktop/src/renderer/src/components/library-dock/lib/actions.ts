import { useCallback } from "react";
import {
  addTagToSelection,
  clearTagsFromSelection,
  copyFilePathsForSelection,
  copyUrlsForSelection,
  exportSelectionCsv,
  exportSelectionFiles,
  failedIdsIn,
  invertSelectionInView,
  isAllSelected,
  pasteTagsToSelection,
  restoreSelection,
  retryFailedSelection,
  selectAllInView,
  trashSelection,
} from "@/lib/save/selection";
import { selectableTasks } from "@/lib/save/tasks";
import { type NativeMenuItem, showContextMenu } from "@/lib/ui/native-menu";
import {
  useViewFilteredCount,
  useViewMode,
} from "@/stores/library-view-context";
import { selection } from "@/stores/selection";
import { useTagClipboard } from "@/stores/tag-clipboard";
import { useTags } from "@/stores/tags";
import { pushToast } from "@/stores/toasts";

interface DockActions {
  destructive: () => void;
  runSelectionTask: () => void;
  openTagMenu: () => void;
  openOverflowMenu: () => void;
}

/** Menu builders operate on the live selection store, so in preview mode they early-return against an empty selection. */
export function useDockActions(
  setConfirmDelete: (open: boolean) => void,
): DockActions {
  const tags = useTags();
  const clipboard = useTagClipboard();
  const viewMode = useViewMode();
  const filteredCount = useViewFilteredCount();
  const inTrash = viewMode === "trash";

  const destructive = useCallback(() => {
    if (inTrash) void restoreSelection(selection.snapshot());
    else void trashSelection(selection.snapshot());
  }, [inTrash]);

  /** Shared by the wand button and the overflow menu's "Run task" submenu. */
  const taskItems = useCallback((): NativeMenuItem[] => {
    const scope = selection.snapshot();
    return selectableTasks().map((task) => ({
      label: task.label,
      onSelect: async () => {
        try {
          const res = await task.run(scope);
          pushToast(res.message, res.ok ? "success" : "error");
        } catch {
          pushToast(`${task.label} failed.`, "error");
        }
      },
    }));
  }, []);

  /** Shared by the tag button and the overflow submenu. */
  const tagItems = useCallback((): NativeMenuItem[] => {
    const scope = selection.snapshot();
    const items: NativeMenuItem[] = [];
    if (tags.length === 0) {
      items.push({ label: "No tags yet", enabled: false });
    } else {
      for (const tag of tags) {
        items.push({
          label: tag.name,
          onSelect: () => void addTagToSelection(scope, tag.name),
        });
      }
    }
    items.push({ type: "separator" });
    items.push({
      label: "Paste tags",
      enabled: clipboard.length > 0,
      shortcut: ["⌘", "⇧", "V"],
      onSelect: () => void pasteTagsToSelection(scope, clipboard),
    });
    items.push({
      label: "Remove all tags",
      onSelect: () => void clearTagsFromSelection(scope),
    });
    return items;
  }, [tags, clipboard]);

  const runSelectionTask = useCallback(() => {
    const scope = selection.snapshot();
    if (scope.length === 0) return;
    void showContextMenu([
      { label: `Run on ${scope.length} selected`, enabled: false },
      { type: "separator" },
      ...taskItems(),
    ]);
  }, [taskItems]);

  const openTagMenu = useCallback(() => {
    const scope = selection.snapshot();
    if (scope.length === 0) return;
    void showContextMenu([
      { label: `Tag ${scope.length} selected`, enabled: false },
      { type: "separator" },
      ...tagItems(),
    ]);
  }, [tagItems]);

  /** The long tail of bulk actions sits behind the overflow button so the pill stays compact. */
  const openOverflowMenu = useCallback(() => {
    const scope = selection.snapshot();
    if (scope.length === 0) return;
    const failedCount = failedIdsIn(scope).length;
    const items: NativeMenuItem[] = [
      {
        label: "Select all",
        enabled: filteredCount > 0 && !isAllSelected(),
        shortcut: ["⌘", "A"],
        onSelect: () => selectAllInView(),
      },
      {
        label: "Invert selection",
        enabled: filteredCount > 0,
        onSelect: () => invertSelectionInView(),
      },
      { type: "separator" },
      { label: "Run task", submenu: taskItems() },
      { label: "Add tag", submenu: tagItems() },
      {
        label: failedCount > 0 ? `Retry ${failedCount} failed` : "Retry failed",
        enabled: failedCount > 0,
        onSelect: () => void retryFailedSelection(scope),
      },
      { type: "separator" },
      {
        label: "Copy links",
        onSelect: () => void copyUrlsForSelection(scope),
      },
      {
        label: "Copy file paths",
        onSelect: () => void copyFilePathsForSelection(scope),
      },
      { type: "separator" },
      {
        label: "Export files…",
        onSelect: () => void exportSelectionFiles(scope),
      },
      {
        label: "Export to CSV…",
        onSelect: () => void exportSelectionCsv(scope),
      },
      { type: "separator" },
      ...(inTrash
        ? ([
            {
              label: "Restore",
              onSelect: () => void restoreSelection(scope),
            },
            {
              label: "Delete Forever…",
              onSelect: () => setConfirmDelete(true),
            },
          ] satisfies NativeMenuItem[])
        : ([
            {
              label: "Move to Trash",
              shortcut: ["⌫"],
              onSelect: () => void trashSelection(scope),
            },
          ] satisfies NativeMenuItem[])),
    ];
    void showContextMenu(items);
  }, [filteredCount, inTrash, taskItems, tagItems, setConfirmDelete]);

  return { destructive, runSelectionTask, openTagMenu, openOverflowMenu };
}
