import { useHotkeySequences, useHotkeys } from "@tanstack/react-hotkeys";
import { useEffect } from "react";
import {
  importPaths,
  newFolder,
  newTag,
  runNewAction,
} from "@/features/library/components/new-menu/actions";
import type { LayoutValue } from "@/features/library/lib/view-prefs";
import { commandMenu } from "@/features/library/state/command-menu";
import { libraryChrome } from "@/features/library/state/library-chrome";
import { libraryHeader } from "@/features/library/state/library-header";
import { newMenuDialog } from "@/features/library/state/new-menu-dialog";
import {
  cycleSortKey,
  setLayout,
  toggleSortDir,
} from "@/features/library/state/view-store";
import { inspect } from "@/features/saves/state/inspect";
import { openSettings } from "@/features/settings/lib/open-settings";
import {
  getPrefsSnapshot,
  patchPrefsSection,
  usePrefs,
} from "@/features/settings/state/prefs";
import { sourceNewMenu } from "@/features/sources/state/source-new-menu";
import { getAppRouter } from "@/shared/lib/app-router";
import {
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
        sequence: [...shortcuts["nav.library"].sequence!],
        callback: () => go("/"),
      },
      {
        sequence: [...shortcuts["nav.sources"].sequence!],
        callback: () => go("/sources"),
      },
      {
        sequence: [...shortcuts["nav.downloads"].sequence!],
        callback: () => go("/downloads"),
      },
      {
        sequence: [...shortcuts["nav.trash"].sequence!],
        callback: () => go("/trash"),
      },
      {
        sequence: [...shortcuts["nav.settings"].sequence!],
        callback: () => openSettings(),
      },
    ],
    { ignoreInputs: true },
  );

  useHotkeys([
    {
      hotkey: shortcuts["library.search"].keys!,
      callback: () => commandMenu.toggle(),
      options: { ignoreInputs: false },
    },
    {
      hotkey: shortcuts["nav.scroll-top"].keys!,
      callback: (event) => {
        event.preventDefault();
        scrollActiveViewport("top");
      },
      options: { ignoreInputs: true, preventDefault: false },
    },
    {
      hotkey: shortcuts["nav.scroll-bottom"].keys!,
      callback: (event) => {
        event.preventDefault();
        scrollActiveViewport("bottom");
      },
      options: { ignoreInputs: true, preventDefault: false },
    },
    {
      hotkey: shortcuts["view.layout-waterfall"].keys!,
      callback: () => setLayout("waterfall" satisfies LayoutValue),
      options: { ignoreInputs: true },
    },
    {
      hotkey: shortcuts["view.layout-grid"].keys!,
      callback: () => setLayout("grid"),
      options: { ignoreInputs: true },
    },
    {
      hotkey: shortcuts["view.layout-justified"].keys!,
      callback: () => setLayout("justified"),
      options: { ignoreInputs: true },
    },
    {
      hotkey: shortcuts["view.layout-list"].keys!,
      callback: () => setLayout("list"),
      options: { ignoreInputs: true },
    },
    {
      hotkey: shortcuts["view.sidebar"].keys!,
      callback: () => {
        if (slideNavActive()) return;
        libraryChrome.toggleSidebar();
      },
      options: { ignoreInputs: true, conflictBehavior: "allow" },
    },
    {
      hotkey: shortcuts["view.agent"].keys!,
      callback: () => {
        if (slideNavActive()) return;
        libraryChrome.toggleAgent();
      },
      options: { ignoreInputs: true, conflictBehavior: "allow" },
    },
    {
      hotkey: shortcuts["view.grayscale"].keys!,
      callback: () => inspect.toggleGrayscale(),
      options: { ignoreInputs: true },
    },
    {
      hotkey: shortcuts["view.pin-preview"].keys!,
      callback: () => inspect.pinCurrent(),
      options: { ignoreInputs: true },
    },
    {
      hotkey: shortcuts["view.options"].keys!,
      callback: () => libraryHeader.togglePopover(),
      options: { ignoreInputs: true },
    },
    {
      hotkey: shortcuts["view.display"].keys!,
      callback: () => libraryHeader.togglePopover(),
      options: { ignoreInputs: true },
    },
    {
      hotkey: shortcuts["view.sort-dir"].keys!,
      callback: () => toggleSortDir(),
      options: { ignoreInputs: true },
    },
    {
      hotkey: shortcuts["view.sort-key"].keys!,
      callback: () => cycleSortKey(),
      options: { ignoreInputs: true },
    },
    {
      hotkey: shortcuts["view.theme-cycle"].keys!,
      callback: () => cycleAppearance(),
      options: { ignoreInputs: true },
    },
    {
      hotkey: shortcuts["sources.new"].keys!,
      callback: () => {
        libraryChrome.setNav({ kind: "sources" });
        go("/sources");
        sourceNewMenu.open();
      },
      options: { ignoreInputs: true },
    },
    {
      hotkey: shortcuts["sources.sync-all"].keys!,
      callback: () => {
        void window.pond.syncRunAll();
      },
      options: { ignoreInputs: true },
    },
    {
      hotkey: shortcuts["library.rescan"].keys!,
      callback: () => {
        void window.pond.query("library.rescan", {});
      },
      options: { ignoreInputs: true },
    },
    {
      hotkey: shortcuts["library.new-folder"].keys!,
      callback: () => newFolder(),
      options: { ignoreInputs: true },
    },
    {
      hotkey: shortcuts["library.new-tag"].keys!,
      callback: () => newTag("tag"),
      options: { ignoreInputs: true },
    },
    {
      hotkey: shortcuts["library.new-tag-group"].keys!,
      callback: () => newTag("tag-group"),
      options: { ignoreInputs: true },
    },
    {
      hotkey: shortcuts["library.new-note"].keys!,
      callback: () => newMenuDialog.open("note"),
      options: { ignoreInputs: true },
    },
    {
      hotkey: shortcuts["library.import-files"].keys!,
      callback: () => void runNewAction(() => importPaths("files")),
      options: { ignoreInputs: true },
    },
    {
      hotkey: shortcuts["library.import-folders"].keys!,
      callback: () => void runNewAction(() => importPaths("folders")),
      options: { ignoreInputs: true },
    },
    {
      hotkey: shortcuts["library.import-links"].keys!,
      callback: () => newMenuDialog.open("links"),
      options: { ignoreInputs: true },
    },
  ]);

  return null;
}
