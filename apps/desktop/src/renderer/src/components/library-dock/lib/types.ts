import type { DockTab } from "./nav-tabs";

/** The mutually exclusive surfaces the pill can show. */
export type DockView =
  | "selection"
  | "ask"
  | "search"
  | "search-help"
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

/** Includes drill-down subviews (sort groups, search help) so they render through the same registry and swap transition. */
export type ViewMenuSection =
  | "layout"
  | "zoom"
  | "sort"
  | "sort-date"
  | "sort-content"
  | "sort-file"
  | "display"
  | "search-help";

export const VIEW_MENU_SECTIONS: readonly ViewMenuSection[] = [
  "layout",
  "zoom",
  "sort",
  "sort-date",
  "sort-content",
  "sort-file",
  "display",
  "search-help",
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
