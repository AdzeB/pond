import type { InsightConfig } from "@pond/schema/db";
import { BarChart, Legend, MetricBlock, ValueTable } from "./lib/charts";
import type { InsightResult } from "./lib/insights";
import { layerVisible } from "./lib/layers";
import {
  AreaLineChart,
  HeatmapChart,
  RadarChart,
  RingChart,
  SunburstChart,
} from "./lib/viz";

// Single display switch shared by the dashboard card and the editor
// preview, so both always render a config the same way.

const LEGEND_DISPLAYS = new Set(["chart", "area", "line"]);

export function InsightBody({
  config,
  data,
  days,
}: {
  config: InsightConfig;
  data: InsightResult;
  days: number;
}) {
  return (
    <>
      {config.display === "metric" ? (
        <MetricBlock data={data} days={days} />
      ) : config.display === "table" ? (
        <ValueTable data={data} />
      ) : config.display === "heatmap" ? (
        <HeatmapChart data={data} viz={config.viz} />
      ) : config.display === "area" || config.display === "line" ? (
        <AreaLineChart data={data} mode={config.display} viz={config.viz} />
      ) : config.display === "ring" || config.display === "pie" ? (
        <RingChart data={data} variant={config.display} viz={config.viz} />
      ) : config.display === "sunburst" ? (
        <SunburstChart data={data} viz={config.viz} />
      ) : config.display === "radar" ? (
        <RadarChart data={data} viz={config.viz} />
      ) : (
        <BarChart data={data} viz={config.viz} />
      )}
      {LEGEND_DISPLAYS.has(config.display) &&
      layerVisible(config.display, config.viz, "legend") ? (
        <Legend data={data} />
      ) : null}
    </>
  );
}
