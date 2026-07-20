import type { DockTab } from "./nav-tabs";

/** The mutually exclusive surfaces the pill can show. */
export type DockView =
  | "selection"
  | "ask"
  | "ask-history"
  | "search"
  | "search-help"
  | "new"
  | "layout"
  | "zoom"
  | "sort"
  | "sort-date"
  | "sort-content"
  | "sort-file"
  | "display"
  | "connect-source"
  | "connect-help"
  | "connect-wait"
  | "watch-source"
  | "watch-help"
  | "watch-kind"
  | "watch-target"
  | "account-detail"
  | "watch-detail"
  | "sync-frequency"
  | "source-new"
  | "analytics-range"
  | "analytics-rename"
  | "analytics-duplicate"
  | "confirm"
  | "selection-run"
  | "selection-tag"
  | "selection-copy"
  | "selection-export"
  | "nav";

/** Includes drill-down subviews (sort groups, search help, ask history) so they render through the same registry and swap transition. */
export type ViewMenuSection =
  | "ask-history"
  | "layout"
  | "zoom"
  | "sort"
  | "sort-date"
  | "sort-content"
  | "sort-file"
  | "display"
  | "search-help"
  | "connect-source"
  | "connect-help"
  | "connect-wait"
  | "watch-source"
  | "watch-help"
  | "watch-kind"
  | "watch-target"
  | "account-detail"
  | "watch-detail"
  | "sync-frequency"
  | "source-new"
  | "analytics-range"
  | "analytics-rename"
  | "analytics-duplicate"
  | "confirm"
  | "selection-run"
  | "selection-tag"
  | "selection-copy"
  | "selection-export";

export const VIEW_MENU_SECTIONS: readonly ViewMenuSection[] = [
  "ask-history",
  "layout",
  "zoom",
  "sort",
  "sort-date",
  "sort-content",
  "sort-file",
  "display",
  "search-help",
  "connect-source",
  "connect-help",
  "connect-wait",
  "watch-source",
  "watch-help",
  "watch-kind",
  "watch-target",
  "account-detail",
  "watch-detail",
  "sync-frequency",
  "source-new",
  "analytics-range",
  "analytics-rename",
  "analytics-duplicate",
  "confirm",
  "selection-run",
  "selection-tag",
  "selection-copy",
  "selection-export",
];

/** Card modes opened from the selection pill; they must outrank the selection in the pill's priority so drilling in doesn't bounce back. */
export const SELECTION_CARD_MODES: readonly ViewMenuSection[] = [
  "confirm",
  "selection-run",
  "selection-tag",
  "selection-copy",
  "selection-export",
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
