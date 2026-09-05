import { useHotkeys } from "@tanstack/react-hotkeys";
import { useSelector } from "@tanstack/react-store";
import { dockMode } from "@/features/library/state/dock-mode";
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
import { trashSelection } from "@/features/saves/lib/selection";
import { pool } from "@/features/saves/state/pool";
import type { Save } from "@/features/saves/types";
import { SHORTCUTS } from "@/shared/lib/shortcuts";

function primarySave(): Save | null {
  const id = primarySelectionStore.state.id;
  return id ? (pool.get(id) ?? null) : null;
}

function withPrimary(action: (save: Save) => void): () => void {
  return () => {
    const save = primarySave();
    if (save) action(save);
  };
}

function canCopyPrimaryMedia(save: Save): boolean {
  return copyableImageIndex(save) != null || resolveFileIndex(save) != null;
}

export function SaveHotkeys() {
  const hasPrimary = useSelector(primarySelectionStore, (s) => s.id) != null;
  const hasMulti = useSelectionSize() > 0;

  useHotkeys([
    {
      hotkey: SHORTCUTS["save.open"].keys!,
      callback: withPrimary((save) => void openDefaultApp(save)),
      options: { enabled: hasPrimary },
    },
    {
      hotkey: SHORTCUTS["save.copy-image"].keys!,
      callback: (event) => {
        const save = primarySave();
        if (!save || !canCopyPrimaryMedia(save)) return;
        const textSelection = window.getSelection();
        if (textSelection && !textSelection.isCollapsed) return;
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
      hotkey: SHORTCUTS["save.copy-url"].keys!,
      callback: withPrimary((save) => {
        if (save.url) void copyUrl(save.url);
      }),
      options: { enabled: hasPrimary, ignoreInputs: true },
    },
    {
      hotkey: SHORTCUTS["save.copy-id"].keys!,
      callback: () => {
        const id = primarySelectionStore.state.id;
        if (id) void copyId(id);
      },
      options: { enabled: hasPrimary, ignoreInputs: true },
    },
    {
      hotkey: SHORTCUTS["save.copy-tags"].keys!,
      callback: withPrimary((save) => copyTags(save)),
      options: { enabled: hasPrimary, ignoreInputs: true },
    },
    {
      hotkey: SHORTCUTS["save.paste-tags"].keys!,
      callback: withPrimary((save) => void pasteTags(save)),
      options: { enabled: hasPrimary, ignoreInputs: true },
    },
    {
      hotkey: SHORTCUTS["save.export"].keys!,
      callback: withPrimary((save) => void exportFile(save)),
      options: { enabled: hasPrimary, ignoreInputs: true },
    },
    {
      hotkey: SHORTCUTS["save.refresh"].keys!,
      callback: withPrimary((save) => void refreshSaveMetadata(save)),
      options: { enabled: hasPrimary },
    },
    {
      hotkey: SHORTCUTS["save.add-tag"].keys!,
      callback: () => {
        if (selection.size() > 1) {
          dockMode.open("selection-tag");
          return;
        }
        if (!primarySelectionStore.state.id) return;
        openTagPicker();
      },
      options: { enabled: hasPrimary || hasMulti, ignoreInputs: true },
    },
    {
      hotkey: SHORTCUTS["save.rename"].keys!,
      callback: withPrimary((save) => {
        if (save.source !== "local") return;
        focusPaneTitle();
      }),
      options: { enabled: hasPrimary, ignoreInputs: true },
    },
    {
      hotkey: SHORTCUTS["save.open-url"].keys!,
      callback: withPrimary((save) => {
        if (!save.url) return;
        void window.pond.openExternal(save.url);
      }),
      options: { enabled: hasPrimary, ignoreInputs: true },
    },
    {
      hotkey: SHORTCUTS["save.reveal"].keys!,
      callback: () => {
        const sid = primarySelectionStore.state.id;
        if (!sid) return;
        void window.pond.revealSave(sid);
      },
      options: { enabled: hasPrimary, ignoreInputs: true },
    },
    {
      hotkey: SHORTCUTS["selection.run"].keys!,
      callback: () => dockMode.open("selection-run"),
      options: { enabled: hasMulti, ignoreInputs: true },
    },
    {
      hotkey: SHORTCUTS["selection.export"].keys!,
      callback: () => {
        if (selection.size() > 1) {
          dockMode.open("selection-export");
          return;
        }
        const save = primarySave();
        if (save) void exportFile(save);
      },
      options: { enabled: hasPrimary || hasMulti, ignoreInputs: true },
    },
    {
      hotkey: SHORTCUTS["save.trash"].keys!,
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
      hotkey: SHORTCUTS["save.delete-forever"].keys!,
      callback: withPrimary((save) => void purgeForever(save)),
      options: { enabled: hasPrimary, ignoreInputs: true },
    },
  ]);

  return null;
}
