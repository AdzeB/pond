import { useHotkeySequences, useHotkeys } from "@tanstack/react-hotkeys";
import type { LayoutValue } from "@/features/library/lib/view-prefs";
import { commandMenu } from "@/features/library/state/command-menu";
import { libraryChrome } from "@/features/library/state/library-chrome";
import { libraryHeader } from "@/features/library/state/library-header";
import {
  cycleSortKey,
  setLayout,
  toggleSortDir,
} from "@/features/library/state/view-store";
import { openSettings } from "@/features/settings/lib/open-settings";
import {
  getPrefsSnapshot,
  patchPrefsSection,
} from "@/features/settings/state/prefs";
import { sourceFlow } from "@/features/sources/state/source-flow";
import { getAppRouter } from "@/shared/lib/app-router";
import { SHORTCUTS } from "@/shared/lib/shortcuts";

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
  useHotkeySequences(
    [
      {
        sequence: [...SHORTCUTS["nav.library"].sequence!],
        callback: () => go("/"),
      },
      {
        sequence: [...SHORTCUTS["nav.sources"].sequence!],
        callback: () => go("/sources"),
      },
      {
        sequence: [...SHORTCUTS["nav.downloads"].sequence!],
        callback: () => go("/downloads"),
      },
      {
        sequence: [...SHORTCUTS["nav.trash"].sequence!],
        callback: () => go("/trash"),
      },
      {
        sequence: [...SHORTCUTS["nav.settings"].sequence!],
        callback: () => openSettings(),
      },
    ],
    { ignoreInputs: true },
  );

  useHotkeys([
    {
      hotkey: SHORTCUTS["library.search"].keys!,
      callback: () => commandMenu.toggle(),
      options: { ignoreInputs: false },
    },
    {
      hotkey: SHORTCUTS["nav.scroll-top"].keys!,
      callback: (event) => {
        event.preventDefault();
        scrollActiveViewport("top");
      },
      options: { ignoreInputs: true, preventDefault: false },
    },
    {
      hotkey: SHORTCUTS["nav.scroll-bottom"].keys!,
      callback: (event) => {
        event.preventDefault();
        scrollActiveViewport("bottom");
      },
      options: { ignoreInputs: true, preventDefault: false },
    },
    {
      hotkey: SHORTCUTS["view.layout-waterfall"].keys!,
      callback: () => setLayout("waterfall" satisfies LayoutValue),
      options: { ignoreInputs: true },
    },
    {
      hotkey: SHORTCUTS["view.layout-grid"].keys!,
      callback: () => setLayout("grid"),
      options: { ignoreInputs: true },
    },
    {
      hotkey: SHORTCUTS["view.layout-justified"].keys!,
      callback: () => setLayout("justified"),
      options: { ignoreInputs: true },
    },
    {
      hotkey: SHORTCUTS["view.layout-list"].keys!,
      callback: () => setLayout("list"),
      options: { ignoreInputs: true },
    },
    {
      hotkey: SHORTCUTS["view.sidebar"].keys!,
      callback: () => {
        if (slideNavActive()) return;
        libraryChrome.toggleSidebar();
      },
      options: { ignoreInputs: true, conflictBehavior: "allow" },
    },
    {
      hotkey: SHORTCUTS["view.agent"].keys!,
      callback: () => {
        if (slideNavActive()) return;
        libraryChrome.toggleAgent();
      },
      options: { ignoreInputs: true, conflictBehavior: "allow" },
    },
    {
      hotkey: SHORTCUTS["view.options"].keys!,
      callback: () => libraryHeader.togglePopover(),
      options: { ignoreInputs: true },
    },
    {
      hotkey: SHORTCUTS["view.display"].keys!,
      callback: () => libraryHeader.togglePopover(),
      options: { ignoreInputs: true },
    },
    {
      hotkey: SHORTCUTS["view.sort-dir"].keys!,
      callback: () => toggleSortDir(),
      options: { ignoreInputs: true },
    },
    {
      hotkey: SHORTCUTS["view.sort-key"].keys!,
      callback: () => cycleSortKey(),
      options: { ignoreInputs: true },
    },
    {
      hotkey: SHORTCUTS["view.theme-cycle"].keys!,
      callback: () => cycleAppearance(),
      options: { ignoreInputs: true },
    },
    {
      hotkey: SHORTCUTS["sources.new"].keys!,
      callback: () => {
        go("/sources");
        sourceFlow.open("source-new");
      },
      options: { ignoreInputs: true },
    },
    {
      hotkey: SHORTCUTS["sources.sync-all"].keys!,
      callback: () => {
        void window.pond.syncRunAll();
      },
      options: { ignoreInputs: true },
    },
    {
      hotkey: SHORTCUTS["library.rescan"].keys!,
      callback: () => {
        void window.pond.query("library.rescan", {});
      },
      options: { ignoreInputs: true },
    },
  ]);

  return null;
}
