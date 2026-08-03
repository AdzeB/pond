/** Pure insight engine, no React or IO; the page reads the in-memory saves pool once and every card derives from the same array. */

export type { InsightGroup, InsightResult } from "./insight-compute";
export { computeInsight } from "./insight-compute";
export {
  applyFilters,
  applyFiltersCached,
  filtersFingerprint,
  filterValueLabel,
  filterValueOptions,
  isSavesInsight,
  savesInWindow,
} from "./insight-filters";
export {
  autoTitle,
  DISPLAY_OPTIONS,
  FILTER_FIELD_OPTIONS,
  formatCount,
  insightTitle,
  newInsight,
  SEGMENT_OPTIONS,
  SLICE_OPTIONS,
} from "./insight-options";
export {
  defaultSize,
  GRID_CELL_W,
  GRID_COLS,
  GRID_GAP,
  GRID_MAX_ROWS,
  GRID_ROW_H,
  type InsightSize,
  sizeOf,
} from "./insight-sizing";
