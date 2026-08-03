import type {
  InsightConfig,
  InsightDisplay,
  InsightWidth,
} from "@pond/schema/db";

/** Cards span `w` columns × `h` rows on a 3-column grid; cards saved before the grid only stored a fractional `width`. */

export const GRID_COLS = 3;
export const GRID_MAX_ROWS = 3;
/** Preview metrics mirrored by the dashboard CSS grid (`grid-auto-rows` / gap). */
export const GRID_CELL_W = 240;
export const GRID_ROW_H = 128;
export const GRID_GAP = 12;

export interface InsightSize {
  w: number;
  h: number;
}

const LEGACY_WIDTH_COLS: Record<InsightWidth, number> = {
  quarter: 1,
  third: 1,
  half: 2,
  full: 3,
};

/** Headline numbers read fine short; charts need the taller cell. */
function defaultRows(display: InsightDisplay): number {
  if (display === "metric") return 1;
  return 2;
}

function clampSpan(value: number, max: number): number {
  return Math.max(1, Math.min(max, Math.round(value)));
}

export function sizeOf(config: InsightConfig): InsightSize {
  const legacy = config.width ? LEGACY_WIDTH_COLS[config.width] : null;
  return {
    w: clampSpan(config.w ?? legacy ?? 2, GRID_COLS),
    h: clampSpan(config.h ?? defaultRows(config.display), GRID_MAX_ROWS),
  };
}

/** Only applied to drafts that haven't been placed on the grid yet. */
export function defaultSize(display: InsightDisplay): InsightSize {
  if (display === "metric") return { w: 1, h: 1 };
  return { w: 2, h: 2 };
}
