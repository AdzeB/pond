export type DockView =
  | "selection"
  | "search"
  | "search-help"
  | "options"
  | "layout"
  | "zoom"
  | "sort"
  | "sort-date"
  | "sort-content"
  | "sort-media"
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
  | "account-profile"
  | "account-sync"
  | "account-maintenance"
  | "watch-detail"
  | "sync-frequency"
  | "source-new"
  | "confirm"
  | "selection-run"
  | "selection-tag"
  | "selection-copy"
  | "selection-export"
  | "nav";

export type ViewMenuSection =
  | "options"
  | "layout"
  | "zoom"
  | "sort"
  | "sort-date"
  | "sort-content"
  | "sort-media"
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
  | "account-profile"
  | "account-sync"
  | "account-maintenance"
  | "watch-detail"
  | "sync-frequency"
  | "source-new"
  | "confirm"
  | "selection-run"
  | "selection-tag"
  | "selection-copy"
  | "selection-export";

const VIEW_MENU_SECTIONS: readonly ViewMenuSection[] = [
  "options",
  "layout",
  "zoom",
  "sort",
  "sort-date",
  "sort-content",
  "sort-media",
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
  "account-profile",
  "account-sync",
  "account-maintenance",
  "watch-detail",
  "sync-frequency",
  "source-new",
  "confirm",
  "selection-run",
  "selection-tag",
  "selection-copy",
  "selection-export",
];

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
