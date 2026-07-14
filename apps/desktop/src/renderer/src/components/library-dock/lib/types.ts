import type { DockTab } from "./nav-tabs";

/** The mutually exclusive surfaces the pill can show. */
export type DockView =
  | "selection"
  | "ask"
  | "search"
  | "status"
  | "new"
  | "layout"
  | "zoom"
  | "sort"
  | "sort-date"
  | "sort-content"
  | "sort-file"
  | "display"
  | "nav";

export type ViewMenuSection =
  | "layout"
  | "zoom"
  | "sort"
  | "sort-date"
  | "sort-content"
  | "sort-file"
  | "display";

export const VIEW_MENU_SECTIONS: readonly ViewMenuSection[] = [
  "layout",
  "zoom",
  "sort",
  "sort-date",
  "sort-content",
  "sort-file",
  "display",
];

export function isViewMenu(view: DockView): view is ViewMenuSection {
  return (VIEW_MENU_SECTIONS as readonly string[]).includes(view);
}

/** Forced pill state for the dock playground; when absent, the pill derives everything from the live stores and the router. */
export interface DockPreview {
  view: DockView;
  activeTab?: DockTab | null;
  selectionSize?: number;
  filteredCount?: number;
  inTrash?: boolean;
  allSelected?: boolean;
}
