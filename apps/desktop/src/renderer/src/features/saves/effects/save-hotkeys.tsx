import { Dialog } from "@pond/ui";
import { useHotkeys } from "@tanstack/react-hotkeys";
import { useSelector } from "@tanstack/react-store";
import { useRef } from "react";
import { openActionDialog } from "@/features/library/state/action-dialog";
import { openFolderPicker } from "@/features/library/state/folder-picker";
import { resultNavigation } from "@/features/library/state/result-navigation";
import {
  primarySelectionStore,
  selection,
  useSelectionSize,
} from "@/features/library/state/selection";
import { tumbleToTrash } from "@/features/library/state/trash-tumble";
import {
  copyableImageIndex,
  copyId,
  copyPrimaryMedia,
  copyTags,
  copyUrl,
  exportFile,
  focusPaneTitle,
  openDefaultApp,
  openTagPicker,
  pasteTags,
  purgeForever,
  refreshSaveMetadata,
  resolveFileIndex,
  trashSave,
  untrashSave,
} from "@/features/saves/lib/actions";
import { ensureSaves } from "@/features/saves/lib/ensure-saves";
import { rateSaves } from "@/features/saves/lib/rating";
import { openSave, saveIdFromPath } from "@/features/saves/lib/save-nav";
import { selectOnlySave } from "@/features/saves/lib/select";
import {
  addTagsToSelection,
  copyFilesForSelection,
  copyIdsForSelection,
  copyTagsForSelection,
  copyUrlsForSelection,
  deleteSelectionForever,
  exportSelectionFiles,
  openDefaultAppForSelection,
  openInBrowserForSelection,
  pasteTagsForSelection,
  refreshDetailsForSelection,
  revealFilesForSelection,
  type SelectionActionResult,
  trashSelection,
} from "@/features/saves/lib/selection";
import { pool } from "@/features/saves/state/pool";
import type { Save } from "@/features/saves/types";
import { getAppRouter } from "@/shared/lib/app-router";
import { RATING_COMMANDS, useShortcutBindings } from "@/shared/lib/shortcuts";
import { notify } from "@/shared/lib/toast";

function primarySave(): Save | null {
  const id = primarySelectionStore.state.id;
  return id ? (pool.get(id) ?? null) : null;
}

function withSelection(
  single: (save: Save) => void,
  multiple: (
    ids: readonly string[],
  ) => void | Promise<void> | Promise<SelectionActionResult>,
): () => void {
  return () => {
    const ids = selection.snapshot();
    if (ids.length > 1) {
      void Promise.resolve(multiple(ids)).catch(() =>
        notify({
          id: "selection-error",
          title: "Couldn’t complete the selection command",
          description: "Try again.",
        }),
      );
      return;
    }
    const save = primarySave();
    if (save) single(save);
  };
}

function canCopyPrimaryMedia(save: Save): boolean {
  return copyableImageIndex(save) != null || resolveFileIndex(save) != null;
}

export function SaveHotkeys() {
  const shortcuts = useShortcutBindings();
  const hasPrimary = useSelector(primarySelectionStore, (s) => s.id) != null;
  const hasMulti = useSelectionSize() > 0;
  const ratingQueue = useRef(Promise.resolve());
  const rate = (rating: number, advance: boolean) => {
    ratingQueue.current = ratingQueue.current
      .then(async () => {
        const primary = primarySelectionStore.state.id;
        const selected = selection.snapshot();
        const ids = selected.length ? selected : primary ? [primary] : [];
        if (!ids.length || (advance && ids.length > 1)) return;
        const current = ids[0];
        const next =
          advance && current ? await resultNavigation.next(current, 1) : null;
        await rateSaves(ids, rating);
        if (!next || primarySelectionStore.state.id !== primary) return;
        await ensureSaves([next]);
        if (primarySelectionStore.state.id !== primary) return;
        const detail =
          saveIdFromPath(getAppRouter()?.state.location.pathname ?? "") !==
          null;
        selectOnlySave(next);
        if (detail) openSave(next);
        else await resultNavigation.reveal(next);
      })
      .catch(() =>
        notify({
          id: "rating-error",
          title: "Couldn’t update the rating",
          description: "Try again.",
        }),
      );
  };

  useHotkeys(
    [
      {
        hotkey: shortcuts["save.assign-folders"].keys!,
        callback: () => {
          const selected = selection.snapshot();
          const primary = primarySelectionStore.state.id;
          openFolderPicker(
            selected.length ? selected : primary ? [primary] : [],
          );
        },
        options: { enabled: hasPrimary || hasMulti, ignoreInputs: true },
      },
      ...RATING_COMMANDS.flatMap((command) => [
        {
          hotkey: shortcuts[command.id].keys!,
          callback: () => rate(command.rating, false),
          options: { enabled: hasPrimary || hasMulti, ignoreInputs: true },
        },
        {
          hotkey: shortcuts[command.nextId].keys!,
          callback: () => rate(command.rating, true),
          options: { enabled: hasPrimary, ignoreInputs: true },
        },
      ]),
      {
        hotkey: shortcuts["save.open"].keys!,
        callback: withSelection(
          (save) => void openDefaultApp(save),
          openDefaultAppForSelection,
        ),
        options: { enabled: hasPrimary },
      },
      {
        hotkey: shortcuts["save.copy-image"].keys!,
        callback: (event) => {
          const textSelection = window.getSelection();
          if (textSelection && !textSelection.isCollapsed) return;
          const ids = selection.snapshot();
          if (ids.length > 1) {
            event.preventDefault();
            void copyFilesForSelection(ids);
            return;
          }
          const save = primarySave();
          if (!save || !canCopyPrimaryMedia(save)) return;
          event.preventDefault();
          void copyPrimaryMedia(save);
        },
        options: {
          enabled: hasPrimary,
          ignoreInputs: true,
          preventDefault: false,
        },
      },
      {
        hotkey: shortcuts["save.copy-url"].keys!,
        callback: withSelection((save) => {
          if (save.url) void copyUrl(save.url);
        }, copyUrlsForSelection),
        options: { enabled: hasPrimary, ignoreInputs: true },
      },
      {
        hotkey: shortcuts["save.copy-id"].keys!,
        callback: () => {
          const ids = selection.snapshot();
          if (ids.length > 1) {
            void copyIdsForSelection(ids);
            return;
          }
          const id = primarySelectionStore.state.id;
          if (id) void copyId(id);
        },
        options: { enabled: hasPrimary, ignoreInputs: true },
      },
      {
        hotkey: shortcuts["save.copy-tags"].keys!,
        callback: withSelection((save) => copyTags(save), copyTagsForSelection),
        options: { enabled: hasPrimary, ignoreInputs: true },
      },
      {
        hotkey: shortcuts["save.paste-tags"].keys!,
        callback: withSelection(
          (save) => void pasteTags(save),
          pasteTagsForSelection,
        ),
        options: { enabled: hasPrimary, ignoreInputs: true },
      },
      {
        hotkey: shortcuts["save.export"].keys!,
        callback: withSelection(
          (save) => void exportFile(save),
          exportSelectionFiles,
        ),
        options: { enabled: hasPrimary, ignoreInputs: true },
      },
      {
        hotkey: shortcuts["save.refresh"].keys!,
        callback: withSelection(
          (save) => void refreshSaveMetadata(save),
          refreshDetailsForSelection,
        ),
        options: { enabled: hasPrimary },
      },
      {
        hotkey: shortcuts["save.add-tag"].keys!,
        callback: () => {
          const ids = selection.snapshot();
          if (ids.length > 1) {
            Dialog.prompt({
              title: "Add Tag",
              confirmLabel: "Add Tag",
              placeholder: "Tag name",
              onConfirm: (value) => addTagsToSelection(ids, [value]),
            });
            return;
          }
          if (!primarySelectionStore.state.id) return;
          openTagPicker();
        },
        options: { enabled: hasPrimary || hasMulti, ignoreInputs: true },
      },
      {
        hotkey: shortcuts["save.rename"].keys!,
        callback: withSelection(
          (save) => {
            if (save.source !== "local") return;
            focusPaneTitle();
          },
          (ids) => openActionDialog(ids, "rename"),
        ),
        options: { enabled: hasPrimary, ignoreInputs: true },
      },
      {
        hotkey: shortcuts["save.open-url"].keys!,
        callback: withSelection((save) => {
          if (!save.url) return;
          void window.pond.openExternal(save.url);
        }, openInBrowserForSelection),
        options: { enabled: hasPrimary, ignoreInputs: true },
      },
      {
        hotkey: shortcuts["save.reveal"].keys!,
        callback: () => {
          const ids = selection.snapshot();
          if (ids.length > 1) {
            void revealFilesForSelection(ids);
            return;
          }
          const sid = primarySelectionStore.state.id;
          if (!sid) return;
          void window.pond.revealSave(sid);
        },
        options: { enabled: hasPrimary, ignoreInputs: true },
      },
      {
        hotkey: shortcuts["selection.export"].keys!,
        callback: withSelection(
          (save) => void exportFile(save),
          exportSelectionFiles,
        ),
        options: { enabled: hasPrimary || hasMulti, ignoreInputs: true },
      },
      {
        hotkey: shortcuts["save.trash"].keys!,
        callback: () => {
          const ids = selection.snapshot();
          if (ids.length > 0) {
            void tumbleToTrash([...ids]).then(() => trashSelection(ids));
            return;
          }
          const save = primarySave();
          if (!save) return;
          if (save.deletedAt) void untrashSave(save);
          else void tumbleToTrash([save.id]).then(() => trashSave(save));
        },
        options: { enabled: hasPrimary || hasMulti },
      },
      {
        /** Mod+Backspace is delete-to-line-start in macOS text fields; never purge while typing. */
        hotkey: shortcuts["save.delete-forever"].keys!,
        callback: withSelection(
          (save) => void purgeForever(save),
          (ids) =>
            Dialog.confirm({
              title: "Delete Forever",
              description: `Delete ${ids.length} selected items and their files? This can’t be undone.`,
              confirmLabel: "Delete Forever",
              onConfirm: () => deleteSelectionForever(ids),
            }),
        ),
        options: { enabled: hasPrimary, ignoreInputs: true },
      },
    ],
    { ignoreInputs: true },
  );

  return null;
}
