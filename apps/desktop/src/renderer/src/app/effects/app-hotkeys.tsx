import { useHotkeySequences, useHotkeys } from "@tanstack/react-hotkeys";
import { useEffect } from "react";
import {
  createNote,
  importPaths,
  newFolder,
  newTag,
  runNewAction,
} from "@/features/library/components/new-menu/actions";
import type { LayoutValue } from "@/features/library/lib/view-prefs";
import { ZOOM_DEFAULT } from "@/features/library/lib/zoom";
import { commandMenu } from "@/features/library/state/command-menu";
import { libraryChrome } from "@/features/library/state/library-chrome";
import { libraryHeader } from "@/features/library/state/library-header";
import { newMenuDialog } from "@/features/library/state/new-menu-dialog";
import {
  adjustZoom,
  cycleLayout,
  cycleSortKey,
  setLayout,
  setZoom,
  toggleSortDir,
} from "@/features/library/state/view-store";
import { confirmEmptyTrash } from "@/features/saves/lib/empty-trash";
import { closeSave, openSave } from "@/features/saves/lib/save-nav";
import { inspect } from "@/features/saves/state/inspect";
import { primarySelection, selection } from "@/features/saves/state/selection";
import { openSettings } from "@/features/settings/lib/open-settings";
import {
  getPrefsSnapshot,
  patchPrefsSection,
  usePrefs,
} from "@/features/settings/state/prefs";
import { sourceNewMenu } from "@/features/sources/state/source-new-menu";
import { getAppRouter } from "@/shared/lib/app-router";
import {
  bindingKeys,
  bindingSequence,
  configureShortcuts,
  useShortcutBindings,
} from "@/shared/lib/shortcuts";

function scrollActiveViewport(position: "top" | "bottom"): void {
  const active = document.activeElement;
  const target =
    active instanceof Element &&
    active !== document.body &&
    active !== document.documentElement
      ? active.closest<HTMLElement>("[data-scroll-viewport]")
      : document.querySelector<HTMLElement>("[data-scroll-viewport]");
  if (!target) return;
  target.scrollTo({
    top: position === "top" ? 0 : target.scrollHeight,
    behavior: "smooth",
  });
}

function go(path: string): void {
  getAppRouter()?.history.push(path);
}

function cycleAppearance(): void {
  const current = getPrefsSnapshot()?.preferences.appearance ?? "system";
  const order = ["system", "light", "dark"] as const;
  const idx = order.indexOf(current);
  const next = order[(idx < 0 ? 0 : idx + 1) % order.length] ?? "system";
  patchPrefsSection("preferences", { appearance: next });
}

function slideNavActive(): boolean {
  return document.querySelector("[data-slide-nav]") != null;
}

export function AppHotkeys() {
  const [preferences, , loaded] = usePrefs("shortcuts");
  useEffect(() => {
    if (loaded) configureShortcuts(preferences);
  }, [preferences, loaded]);
  const shortcuts = useShortcutBindings();
  useHotkeySequences(
    [
      {
        sequence: [...bindingSequence(shortcuts, "nav.library")],
        callback: () => go("/"),
      },
      {
        sequence: [...bindingSequence(shortcuts, "nav.sources")],
        callback: () => go("/sources"),
      },
      {
        sequence: [...bindingSequence(shortcuts, "nav.downloads")],
        callback: () => go("/downloads"),
      },
      {
        sequence: [...bindingSequence(shortcuts, "nav.trash")],
        callback: () => go("/trash"),
      },
      {
        sequence: [...bindingSequence(shortcuts, "nav.settings")],
        callback: () => openSettings(),
      },
    ],
    { ignoreInputs: true },
  );

  useHotkeys([
    {
      hotkey: bindingKeys(shortcuts, "library.search"),
      callback: () => commandMenu.toggle(),
      options: { ignoreInputs: false },
    },
    {
      hotkey: bindingKeys(shortcuts, "app.settings"),
      callback: () => openSettings(),
      options: { ignoreInputs: true },
    },
    {
      hotkey: bindingKeys(shortcuts, "nav.back"),
      callback: () => getAppRouter()?.history.back(),
      options: { ignoreInputs: true },
    },
    {
      hotkey: bindingKeys(shortcuts, "nav.forward"),
      callback: () => getAppRouter()?.history.forward(),
      options: { ignoreInputs: true },
    },
    {
      hotkey: bindingKeys(shortcuts, "nav.scroll-top"),
      callback: (event) => {
        event.preventDefault();
        scrollActiveViewport("top");
      },
      options: { ignoreInputs: true, preventDefault: false },
    },
    {
      hotkey: bindingKeys(shortcuts, "nav.scroll-bottom"),
      callback: (event) => {
        event.preventDefault();
        scrollActiveViewport("bottom");
      },
      options: { ignoreInputs: true, preventDefault: false },
    },
    {
      hotkey: bindingKeys(shortcuts, "view.layout-waterfall"),
      callback: () => setLayout("waterfall" satisfies LayoutValue),
      options: { ignoreInputs: true },
    },
    {
      hotkey: bindingKeys(shortcuts, "view.layout-grid"),
      callback: () => setLayout("grid"),
      options: { ignoreInputs: true },
    },
    {
      hotkey: bindingKeys(shortcuts, "view.layout-justified"),
      callback: () => setLayout("justified"),
      options: { ignoreInputs: true },
    },
    {
      hotkey: bindingKeys(shortcuts, "view.layout-list"),
      callback: () => setLayout("list"),
      options: { ignoreInputs: true },
    },
    {
      hotkey: bindingKeys(shortcuts, "view.layout-cycle"),
      callback: () => cycleLayout(),
      options: { ignoreInputs: true },
    },
    {
      hotkey: bindingKeys(shortcuts, "view.inspector"),
      callback: () => {
        const openId = primarySelection.get();
        if (openId) {
          closeSave();
          return;
        }
        const anchor = selection.getAnchor();
        if (anchor) openSave(anchor);
      },
      options: { ignoreInputs: true },
    },
    {
      hotkey: bindingKeys(shortcuts, "view.zoom-in"),
      callback: () => adjustZoom(20),
      options: { ignoreInputs: true },
    },
    {
      hotkey: bindingKeys(shortcuts, "view.zoom-out"),
      callback: () => adjustZoom(-20),
      options: { ignoreInputs: true },
    },
    {
      hotkey: bindingKeys(shortcuts, "view.zoom-reset"),
      callback: () => setZoom(ZOOM_DEFAULT),
      options: { ignoreInputs: true },
    },
    {
      hotkey: bindingKeys(shortcuts, "view.sidebar"),
      callback: () => {
        if (slideNavActive()) return;
        libraryChrome.toggleSidebar();
      },
      options: { ignoreInputs: true, conflictBehavior: "allow" },
    },
    {
      hotkey: bindingKeys(shortcuts, "view.agent"),
      callback: () => {
        if (slideNavActive()) return;
        libraryChrome.toggleAgent();
      },
      options: { ignoreInputs: true, conflictBehavior: "allow" },
    },
    {
      hotkey: bindingKeys(shortcuts, "view.grayscale"),
      callback: () => inspect.toggleGrayscale(),
      options: { ignoreInputs: true },
    },
    {
      hotkey: bindingKeys(shortcuts, "view.options"),
      callback: () => libraryHeader.togglePopover(),
      options: { ignoreInputs: true },
    },
    {
      hotkey: bindingKeys(shortcuts, "view.display"),
      callback: () => libraryHeader.togglePopover(),
      options: { ignoreInputs: true },
    },
    {
      hotkey: bindingKeys(shortcuts, "view.sort-dir"),
      callback: () => toggleSortDir(),
      options: { ignoreInputs: true },
    },
    {
      hotkey: bindingKeys(shortcuts, "view.sort-key"),
      callback: () => cycleSortKey(),
      options: { ignoreInputs: true },
    },
    {
      hotkey: bindingKeys(shortcuts, "view.theme-cycle"),
      callback: () => cycleAppearance(),
      options: { ignoreInputs: true },
    },
    {
      hotkey: bindingKeys(shortcuts, "sources.new"),
      callback: () => {
        libraryChrome.setNav({ kind: "sources" });
        go("/sources");
        sourceNewMenu.open();
      },
      options: { ignoreInputs: true },
    },
    {
      hotkey: bindingKeys(shortcuts, "sources.sync-all"),
      callback: () => {
        void window.pond.syncRunAll();
      },
      options: { ignoreInputs: true },
    },
    {
      hotkey: bindingKeys(shortcuts, "library.rescan"),
      callback: () => {
        void window.pond.query("library.rescan", {});
      },
      options: { ignoreInputs: true },
    },
    {
      hotkey: bindingKeys(shortcuts, "library.new-folder"),
      callback: () => newFolder(),
      options: { ignoreInputs: true },
    },
    {
      hotkey: bindingKeys(shortcuts, "library.new-tag"),
      callback: () => newTag("tag"),
      options: { ignoreInputs: true },
    },
    {
      hotkey: bindingKeys(shortcuts, "library.new-tag-group"),
      callback: () => newTag("tag-group"),
      options: { ignoreInputs: true },
    },
    {
      hotkey: bindingKeys(shortcuts, "library.new-note"),
      callback: () => void runNewAction(createNote),
      options: { ignoreInputs: true },
    },
    {
      hotkey: bindingKeys(shortcuts, "library.import-files"),
      callback: () => void runNewAction(() => importPaths("files")),
      options: { ignoreInputs: true },
    },
    {
      hotkey: bindingKeys(shortcuts, "library.import-folders"),
      callback: () => void runNewAction(() => importPaths("folders")),
      options: { ignoreInputs: true },
    },
    {
      hotkey: bindingKeys(shortcuts, "library.import-links"),
      callback: () => newMenuDialog.open("links"),
      options: { ignoreInputs: true },
    },
    {
      hotkey: bindingKeys(shortcuts, "trash.empty"),
      callback: () => confirmEmptyTrash(),
      options: { ignoreInputs: true },
    },
  ]);

  return null;
}
