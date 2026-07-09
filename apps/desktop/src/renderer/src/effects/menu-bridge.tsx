import {
  DEFAULT_SYSTEM_DARK_ID,
  DEFAULT_SYSTEM_LIGHT_ID,
} from "@pond/schema/db";
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
} from "@/lib/save/actions";
import { trashSelection } from "@/lib/save/selection";
import { getAppRouter } from "@/lib/ui/app-router";
import type { LayoutValue } from "@/lib/ui/view-prefs";
import { dockMode } from "@/stores/dock-mode";
import { pool } from "@/stores/pool";
import { usePrefs } from "@/stores/prefs";
import { primarySelection, selection } from "@/stores/selection";
import { cycleLayout, setLayout } from "@/stores/view-store";

export function MenuBridge() {
  const [, patchPreferences] = usePrefs("preferences");

  useEffect(() => {
    return window.pond.onMenuAction((id) => {
      switch (id) {
        case "history.back":
          getAppRouter()?.history.back();
          return;

        case "history.forward":
          getAppRouter()?.history.forward();
          return;

        case "view.inspector.toggle": {
          // Toggle the drawer: close if open, else reopen the anchored save.
          if (primarySelection.get()) {
            primarySelection.set(null);
          } else {
            const anchor = selection.getAnchor();
            if (anchor) primarySelection.set(anchor);
          }
          return;
        }

        case "view.layout.cycle":
          cycleLayout();
          return;

        case "view.layout.waterfall":
        case "view.layout.grid":
        case "view.layout.justified":
        case "view.layout.list":
          setLayout(id.slice("view.layout.".length) as LayoutValue);
          return;

        case "theme.light":
          patchPreferences({
            themeMode: "preset",
            presetId: DEFAULT_SYSTEM_LIGHT_ID,
          });
          return;

        case "theme.dark":
          patchPreferences({
            themeMode: "preset",
            presetId: DEFAULT_SYSTEM_DARK_ID,
          });
          return;

        case "theme.system":
          patchPreferences({ themeMode: "system" });
          return;

        case "refresh.all":
          void window.pond.refreshBackfillStart({});
          return;

        case "refresh.cancel":
          void window.pond.refreshBackfillCancel();
          return;

        case "trash.empty":
          void window.pond.query("saves.emptyTrash", {});
          return;

        case "trash.restore-all":
          void window.pond.query("saves.restoreAll", {});
          return;

        case "library.move":
          void window.pond.query("library.move", {});
          return;

        case "developer.restart-api":
          void window.pond.query("api.restart", {});
          return;

        case "developer.open-logs":
          void window.pond.query("developer.openLogs", {});
          return;

        case "developer.ipc-inspector":
          void window.pond.query("developer.openIpcInspector", {});
          return;

        case "developer.dock-playground":
          void getAppRouter()?.navigate({ to: "/playground" });
          return;

        case "save.new":
          dockMode.open("new");
          return;

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
          void copyUrl(save.url);
          return;
        }

        case "save.copy-id": {
          const sid = primarySelection.get();
          if (!sid) return;
          void copyId(sid);
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
          void refreshSaveMetadata(save);
          return;
        }

        case "save.trash": {
          const save = currentSave();
          if (!save) return;
          void trashSave(save);
          return;
        }

        case "save.untrash": {
          const save = currentSave();
          if (!save) return;
          void untrashSave(save);
          return;
        }

        case "save.delete-forever": {
          const save = currentSave();
          if (!save) return;
          void purgeForever(save);
          return;
        }

        case "save.bulk-trash": {
          const ids = selection.snapshot();
          if (ids.length === 0) return;
          void trashSelection(ids);
          return;
        }

        case "save.bulk-refresh": {
          const ids = selection.snapshot();
          if (ids.length === 0) return;
          void (async () => {
            for (const sid of ids) {
              await window.pond.refreshSave(sid);
            }
          })();
          return;
        }
      }
    });
  }, [patchPreferences]);

  return null;
}

function currentSave() {
  const id = primarySelection.get();
  if (!id) return null;
  return pool.get(id) ?? null;
}
