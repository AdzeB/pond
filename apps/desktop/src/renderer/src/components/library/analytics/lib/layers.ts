import type { InsightDisplay, InsightVizOptions } from "@pond/schema/db";

/** Per-display layer catalog for the insight editor; visibility persists in `viz.hidden`, except area/line points which use `viz.points`. */

export interface InsightLayer {
  id: string;
  label: string;
  /** Locked layers are the display's defining mark; they can't be hidden. */
  locked?: boolean;
  /** The layer the properties panel opens on (defaults to the locked one). */
  primary?: boolean;
}

const TIME_CHROME: InsightLayer[] = [
  { id: "x-axis", label: "X axis" },
  { id: "legend", label: "Legend" },
  { id: "tooltip", label: "Tooltip" },
];

const DISPLAY_LAYERS: Partial<Record<InsightDisplay, InsightLayer[]>> = {
  chart: [
    { id: "grid", label: "Grid" },
    { id: "bars", label: "Bars", locked: true },
    ...TIME_CHROME,
  ],
  area: [
    { id: "grid", label: "Grid" },
    { id: "fill", label: "Fill" },
    { id: "line", label: "Line", primary: true },
    { id: "points", label: "Points" },
    ...TIME_CHROME,
  ],
  line: [
    { id: "grid", label: "Grid" },
    { id: "line", label: "Line", locked: true },
    { id: "points", label: "Points" },
    ...TIME_CHROME,
  ],
  ring: [
    { id: "wheel", label: "Wheel", locked: true },
    { id: "center", label: "Center" },
    { id: "rows", label: "Rows" },
  ],
  pie: [
    { id: "wheel", label: "Wheel", locked: true },
    { id: "rows", label: "Rows" },
  ],
  sunburst: [
    { id: "wheel", label: "Inner ring", locked: true },
    { id: "outer", label: "Outer ring" },
    { id: "center", label: "Center" },
    { id: "rows", label: "Rows" },
  ],
  radar: [
    { id: "grid", label: "Grid" },
    { id: "polygon", label: "Polygon", locked: true },
    { id: "points", label: "Points" },
    { id: "labels", label: "Labels" },
    { id: "rows", label: "Rows" },
  ],
  heatmap: [
    { id: "cells", label: "Cells", locked: true },
    { id: "labels", label: "Labels" },
  ],
};

export function layersFor(display: InsightDisplay): InsightLayer[] {
  return DISPLAY_LAYERS[display] ?? [];
}

export function layerVisible(
  display: InsightDisplay,
  viz: InsightVizOptions | undefined,
  id: string,
): boolean {
  /** Area/line points live in `viz.points`, not `viz.hidden`. */
  if ((display === "area" || display === "line") && id === "points") {
    return viz?.points ?? false;
  }
  if (viz?.hidden?.includes(id)) return false;
  /** `fill: "none"` also counts as a hidden fill layer. */
  if (display === "area" && id === "fill") {
    return (viz?.fill ?? "gradient") !== "none";
  }
  return true;
}
