import { useEffect } from "react";
import { openShortcutsSheet } from "@/app/components/shortcuts-sheet/shortcuts-sheet";
import { isLayoutValue } from "@/features/library/lib/view-prefs";
import { ZOOM_DEFAULT } from "@/features/library/lib/zoom";
import { commandMenu } from "@/features/library/state/command-menu";
import { libraryChrome } from "@/features/library/state/library-chrome";
import {
  primarySelection,
  selection,
} from "@/features/library/state/selection";
import { tumbleToTrash } from "@/features/library/state/trash-tumble";
import {
  adjustZoom,
  cycleLayout,
  setLayout,
  setZoom,
} from "@/features/library/state/view-store";
import {
  copyId,
  copyPrimaryMedia,
  copyUrl,
  focusPaneTitle,
  openDefaultApp,
  openTagPicker,
  purgeForever,
  refreshSaveMetadata,
  trashSave,
  untrashSave,
} from "@/features/saves/lib/actions";
import { confirmEmptyTrash } from "@/features/saves/lib/empty-trash";
import { closeSave, openSave } from "@/features/saves/lib/save-nav";
import { trashSelection } from "@/features/saves/lib/selection";
import { pool } from "@/features/saves/state/pool";
import { usePrefs } from "@/features/settings/state/prefs";
import { sourceFlow } from "@/features/sources/state/source-flow";
import { getAppRouter } from "@/shared/lib/app-router";

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
          const openId = primarySelection.get();
          if (openId) {
            closeSave();
          } else {
            const anchor = selection.getAnchor();
            if (anchor) openSave(anchor);
          }
          return;
        }

        case "view.layout.cycle":
          cycleLayout();
          return;

        case "view.zoom-in":
          adjustZoom(20);
          return;

        case "view.zoom-out":
          adjustZoom(-20);
          return;

        case "view.zoom-reset":
          setZoom(ZOOM_DEFAULT);
          return;

        case "help.shortcuts":
          openShortcutsSheet();
          return;

        case "library.search":
          commandMenu.open();
          return;

        case "view.layout.waterfall":
        case "view.layout.grid":
        case "view.layout.justified":
        case "view.layout.list": {
          const next = id.slice("view.layout.".length);
          if (isLayoutValue(next)) setLayout(next);
          return;
        }

        case "library.connect":
          getAppRouter()?.history.push("/sources");
          sourceFlow.open("connect-source");
          return;

        case "view.sidebar.toggle":
          libraryChrome.toggleSidebar();
          return;

        case "view.agent.toggle":
          libraryChrome.toggleAgent();
          return;

        case "theme.light":
          patchPreferences({
            appearance: "light",
          });
          return;

        case "theme.dark":
          patchPreferences({
            appearance: "dark",
          });
          return;

        case "theme.system":
          patchPreferences({ appearance: "system" });
          return;

        case "refresh.all":
          void window.pond.refreshBackfillStart({});
          return;

        case "refresh.cancel":
          void window.pond.refreshBackfillCancel();
          return;

        case "trash.empty":
          confirmEmptyTrash();
          return;

        case "trash.restore-all":
          void window.pond.query("saves.restoreAll", {});
          return;

        case "library.move":
          void window.pond.query("library.move", {});
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

        case "save.copy-media": {
          const save = currentSave();
          if (!save) return;
          void copyPrimaryMedia(save);
          return;
        }

        case "save.copy-id": {
          const sid = primarySelection.get();
          if (!sid) return;
          void copyId(sid);
          return;
        }

        case "save.rename": {
          const save = currentSave();
          if (save?.source !== "local") return;
          focusPaneTitle();
          return;
        }

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
          void tumbleToTrash([save.id]).then(() => trashSave(save));
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
          void tumbleToTrash(ids).then(() => trashSelection(ids));
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
