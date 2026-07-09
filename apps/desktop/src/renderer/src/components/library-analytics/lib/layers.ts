import type { InsightDisplay, InsightVizOptions } from "@pond/schema/db";

// Per-display layer catalog for the Studio-style editor, mirroring how
// Bklit composes charts from layer components (Grid, Area, XAxis, Tooltip,
// RingCenter, RadarLabels…). Each display lists its layers top-down; the
// editor renders them as rows with eye toggles and a contextual properties
// panel. Visibility persists in the insight's `viz.hidden` array, except
// area/line points which keep their pre-existing `viz.points` flag.

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

/** The display's defining mark — what the properties panel opens on. */
export function primaryLayer(display: InsightDisplay): string | null {
  const layers = layersFor(display);
  return (
    layers.find((l) => l.primary)?.id ??
    layers.find((l) => l.locked)?.id ??
    null
  );
}

export function layerVisible(
  display: InsightDisplay,
  viz: InsightVizOptions | undefined,
  id: string,
): boolean {
  // Area/line points predate the layers system and live in `viz.points`.
  if ((display === "area" || display === "line") && id === "points") {
    return viz?.points ?? false;
  }
  if (viz?.hidden?.includes(id)) return false;
  // `fill: "none"` predates the fill layer; treat it as hidden.
  if (display === "area" && id === "fill") {
    return (viz?.fill ?? "gradient") !== "none";
  }
  return true;
}
