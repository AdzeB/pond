export type DockView =
  | "selection"
  | "confirm"
  | "selection-run"
  | "selection-tag"
  | "selection-copy"
  | "selection-export"
  | "nav";

export type ViewMenuSection =
  | "confirm"
  | "selection-run"
  | "selection-tag"
  | "selection-copy"
  | "selection-export";

const VIEW_MENU_SECTIONS: ReadonlySet<string> = new Set<ViewMenuSection>([
  "confirm",
  "selection-run",
  "selection-tag",
  "selection-copy",
  "selection-export",
]);

export const SELECTION_CARD_MODES: ReadonlySet<string> =
  new Set<ViewMenuSection>([
    "confirm",
    "selection-run",
    "selection-tag",
    "selection-copy",
    "selection-export",
  ]);

export function isViewMenu(view: DockView): view is ViewMenuSection {
  return VIEW_MENU_SECTIONS.has(view);
}
