import { useToast } from "@pond/ui";
import { useEffect } from "react";
import {
  copyId,
  copyUrl,
  focusPaneTitle,
  openDefaultApp,
  openTagPicker,
  purgeForever,
  refreshSaveMetadata,
  trashSave,
  untrashSave,
} from "@/lib/save-actions";
import { toggleInspector, toggleSidebar } from "@/lib/shell-state";
import { pool } from "@/pool/pool";
import { usePrefs } from "@/pool/prefs";
import { primarySelection, selection } from "@/pool/selection";

function dispatchKey(init: KeyboardEventInit): void {
  window.dispatchEvent(
    new KeyboardEvent("keydown", { bubbles: true, ...init }),
  );
}

export function MenuBridge() {
  const [, patchPreferences] = usePrefs("preferences");
  const toast = useToast();

  useEffect(() => {
    return window.pond.onMenuAction((id) => {
      switch (id) {
        case "palette.open":
          dispatchKey({ key: "k", metaKey: true, ctrlKey: true });
          return;

        case "find.search":
          dispatchKey({ key: "/" });
          return;

        case "find.filter":
          dispatchKey({ key: "f" });
          return;

        case "view.sidebar.toggle":
          toggleSidebar();
          return;

        case "view.inspector.toggle":
          toggleInspector();
          return;

        case "view.layout.cycle":
          dispatchKey({ key: "b", code: "KeyB", metaKey: true });
          return;

        case "view.layout.waterfall":
        case "view.layout.grid":
        case "view.layout.justified":
        case "view.layout.list":
          // Handled by LayoutMenuBridge (router-scoped sibling).
          return;

        case "theme.light":
          patchPreferences({ theme: "light" });
          return;

        case "theme.dark":
          patchPreferences({ theme: "dark" });
          return;

        case "theme.system":
          patchPreferences({ theme: "system" });
          return;

        case "refresh.all":
          void (async () => {
            const r = await window.pond.refreshBackfillStart({});
            if (r.ok) {
              toast.add({
                title: `Refreshing ${r.total} saves`,
                type: "success",
              });
            } else {
              toast.add({
                title: `Refresh: ${r.reason.replace("_", " ")}`,
                type: "error",
              });
            }
          })();
          return;

        case "refresh.cancel":
          void window.pond.refreshBackfillCancel();
          return;

        case "trash.empty":
          void (async () => {
            await window.pond.query("saves.emptyTrash", {});
            toast.add({ title: "Trash emptied", type: "success" });
          })();
          return;

        case "trash.restore-all":
          void (async () => {
            await window.pond.query("saves.restoreAll", {});
            toast.add({
              title: "Restored all saves from Trash",
              type: "success",
            });
          })();
          return;

        case "library.move":
          void window.pond.query("library.move", {});
          return;

        case "developer.restart-api":
          void (async () => {
            await window.pond.query("api.restart", {});
            toast.add({ title: "API restarting", type: "success" });
          })();
          return;

        case "developer.open-logs":
          void window.pond.query("developer.openLogs", {});
          return;

        case "developer.ipc-inspector":
          void window.pond.query("developer.openIpcInspector", {});
          return;

        case "save.open-detail": {
          const sid = primarySelection.get();
          if (!sid) return;
          dispatchKey({ key: "Enter" });
          return;
        }

        case "save.open-with-default": {
          const save = currentSave();
          if (!save) return;
          void openDefaultApp(save);
          return;
        }

        case "save.open-original": {
          const save = currentSave();
          if (!save?.url) return;
          void window.pond.openExternal(save.url);
          return;
        }

        case "save.reveal": {
          const sid = primarySelection.get();
          if (!sid) return;
          void window.pond.revealSave(sid);
          return;
        }

        case "save.copy-url": {
          const save = currentSave();
          if (!save?.url) return;
          void copyUrl(save.url, toast);
          return;
        }

        case "save.copy-id": {
          const sid = primarySelection.get();
          if (!sid) return;
          void copyId(sid, toast);
          return;
        }

        case "save.rename":
          if (!primarySelection.get()) return;
          focusPaneTitle();
          return;

        case "save.add-tag":
          if (!primarySelection.get()) return;
          openTagPicker();
          return;

        case "save.refresh": {
          const save = currentSave();
          if (!save) return;
          void refreshSaveMetadata(save, toast);
          return;
        }

        case "save.trash": {
          const save = currentSave();
          if (!save) return;
          void trashSave(save, toast);
          return;
        }

        case "save.untrash": {
          const save = currentSave();
          if (!save) return;
          void untrashSave(save, toast);
          return;
        }

        case "save.delete-forever": {
          const save = currentSave();
          if (!save) return;
          void purgeForever(save, toast);
          return;
        }

        case "save.bulk-trash": {
          const ids = selection.snapshot();
          if (ids.length === 0) return;
          void (async () => {
            await window.pond.batch(
              ids.map((sid) => ({
                kind: "trash",
                model: "save",
                id: sid,
                meta: { actor: "user", actorReason: "menu-bulk-trash" },
              })),
            );
            toast.add({
              title: `Moved ${ids.length} save${ids.length === 1 ? "" : "s"} to trash`,
              type: "success",
            });
          })();
          return;
        }

        case "save.bulk-refresh": {
          const ids = selection.snapshot();
          if (ids.length === 0) return;
          void (async () => {
            let ok = 0;
            for (const sid of ids) {
              const r = await window.pond.refreshSave(sid);
              if (r.ok) ok++;
            }
            toast.add({
              title: `Refreshed ${ok}/${ids.length} saves`,
              type: "success",
            });
          })();
          return;
        }
      }
    });
  }, [patchPreferences, toast]);

  return null;
}

function currentSave() {
  const id = primarySelection.get();
  if (!id) return null;
  return pool.get(id) ?? null;
}
