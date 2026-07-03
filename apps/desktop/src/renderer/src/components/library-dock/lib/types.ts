import type { DockTab } from "./nav-tabs";

// The mutually exclusive surfaces the pill can show.
export type DockView =
  | "selection"
  | "ask"
  | "search"
  | "status"
  | "new"
  | "options"
  | "library"
  | "nav";

// A forced rendering of the pill, used by the dock playground to drive every
// state/sub-state without touching the live stores. When absent, the pill
// derives everything from the real selection/ask/view stores and the router.
export interface DockPreview {
  view: DockView;
  activeTab?: DockTab | null;
  selectionSize?: number;
  filteredCount?: number;
  inTrash?: boolean;
  allSelected?: boolean;
}
