import { useHotkeySequences, useHotkeys } from "@tanstack/react-hotkeys";
import { SHORTCUTS } from "@/lib/save/shortcuts";
import { getAppRouter } from "@/lib/ui/app-router";
import { openLibrarySearch } from "@/lib/ui/open-search";
import type { LayoutValue } from "@/lib/ui/view-prefs";
import { dockMode } from "@/stores/dock-mode";
import { getPrefsSnapshot, patchPrefsSection } from "@/stores/prefs";
import { settingsModal } from "@/stores/settings-modal";
import { cycleSortKey, setLayout, toggleSortDir } from "@/stores/view-store";

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
  const idx = order.indexOf(current as (typeof order)[number]);
  const next = order[(idx < 0 ? 0 : idx + 1) % order.length] ?? "system";
  patchPrefsSection("preferences", { appearance: next });
}

/**
 * Dock shortcuts owned by the renderer; the Go menu shows them display-only.
 * @remarks `ignoreInputs: false` so the dock opens even while a field is focused.
 */
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
        sequence: [...SHORTCUTS["nav.trash"].sequence!],
        callback: () => go("/trash"),
      },
      {
        sequence: [...SHORTCUTS["nav.settings"].sequence!],
        callback: () => settingsModal.open(),
      },
    ],
    { ignoreInputs: true },
  );

  useHotkeys([
    {
      hotkey: SHORTCUTS["dock.search"].keys!,
      callback: () => openLibrarySearch(),
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
      hotkey: SHORTCUTS["view.options"].keys!,
      callback: () => dockMode.open("options"),
      options: { ignoreInputs: true },
    },
    {
      hotkey: SHORTCUTS["view.display"].keys!,
      callback: () => dockMode.open("display"),
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
        dockMode.open("source-new");
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
