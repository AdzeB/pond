import type { InsightVizOptions } from "@pond/schema/db";
import { useState } from "react";
import { BrandTile } from "@/components/library-sync-monitor-source-tile";
import styles from "../../styles.module.css";
import type { InsightResult } from "../insights";
import { layerVisible } from "../layers";

// Category radar: one accent-colored polygon over the sliced categories,
// dashed grid rings at thirds, and a
// legend-row mirror for exact values. Needs 3+ categories to make a shape;
// the engine caps spokes at 8 so labels stay apart.

const SIZE = 148;
const PLOT_R = 52;
const LABEL_R = PLOT_R + 12;
const DEFAULT_GRID_LEVELS = 3;

function pointAt(
  index: number,
  count: number,
  radius: number,
): [number, number] {
  // Start at 12 o'clock, clockwise.
  const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
  return [Math.cos(angle) * radius, Math.sin(angle) * radius];
}

function polygonPoints(count: number, radiusAt: (i: number) => number): string {
  return Array.from({ length: count }, (_, i) =>
    pointAt(i, count, radiusAt(i)).join(","),
  ).join(" ");
}

export function RadarChart({
  data,
  viz,
}: {
  data: InsightResult;
  viz?: InsightVizOptions;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const showGrid = layerVisible("radar", viz, "grid");
  const showPoints = layerVisible("radar", viz, "points");
  const showLabels = layerVisible("radar", viz, "labels");
  const showRows = layerVisible("radar", viz, "rows");
  const fillOpacity = viz?.fillOpacity ?? 0.18;
  const levels = Math.max(
    1,
    Math.round(viz?.gridLevels ?? DEFAULT_GRID_LEVELS),
  );
  const gridLevels = Array.from({ length: levels }, (_, i) => (i + 1) / levels);
  // Prefer active categories, but pad with zeros if that leaves too few
  // spokes; hard-cap at 8 (day slices bypass the engine's group cap).
  const nonZero = data.groups.filter((g) => g.value > 0);
  const groups = (nonZero.length >= 3 ? nonZero : data.groups).slice(0, 8);
  const n = groups.length;

  if (n < 3) {
    return (
      <div className={styles["viz-empty"]}>
        Need at least 3 categories for a radar
      </div>
    );
  }

  const max = groups.reduce((m, g) => Math.max(m, g.value), 0);
  const radiusOf = (i: number) =>
    max > 0 ? ((groups[i]?.value ?? 0) / max) * PLOT_R : 0;
  const c = SIZE / 2;

  return (
    <div className={styles["ring-layout"]}>
      <div className={styles["ring-figure"]}>
        <svg
          className={styles["viz-wheel"]}
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label="Radar chart"
          onMouseLeave={() => setHover(null)}
        >
          <g transform={`translate(${c} ${c})`}>
            {showGrid
              ? gridLevels.map((level) => (
                  <polygon
                    key={level}
                    points={polygonPoints(n, () => level * PLOT_R)}
                    fill="none"
                    className={styles["viz-rule"]}
                  />
                ))
              : null}
            {showGrid
              ? groups.map((group, i) => {
                  const [x, y] = pointAt(i, n, PLOT_R);
                  return (
                    <line
                      key={group.key}
                      x1={0}
                      y1={0}
                      x2={x}
                      y2={y}
                      className={styles["viz-rule"]}
                    />
                  );
                })
              : null}
            <polygon
              className={styles["viz-bloom"]}
              points={polygonPoints(n, radiusOf)}
              fill="var(--ds-accent-9)"
              fillOpacity={fillOpacity}
              stroke="var(--ds-accent-9)"
              strokeWidth={1.5}
              strokeLinejoin="round"
            />
            {showPoints
              ? groups.map((group, i) => {
                  const [x, y] = pointAt(i, n, radiusOf(i));
                  return (
                    // biome-ignore lint/a11y/noStaticElementInteractions: hover-only chart affordance; values are readable in the rows.
                    <circle
                      key={group.key}
                      cx={x}
                      cy={y}
                      r={hover === i ? 3.5 : 2.5}
                      fill="var(--ds-accent-9)"
                      onMouseEnter={() => setHover(i)}
                    />
                  );
                })
              : null}
            {showLabels
              ? groups.map((group, i) => {
                  const [x, y] = pointAt(i, n, LABEL_R);
                  return (
                    // biome-ignore lint/a11y/noStaticElementInteractions: hover-only chart affordance; values are readable in the rows.
                    <text
                      key={group.key}
                      x={x}
                      y={y}
                      className={styles["radar-label"]}
                      data-hover={hover === i || undefined}
                      textAnchor={
                        Math.abs(x) < 6 ? "middle" : x > 0 ? "start" : "end"
                      }
                      dominantBaseline={
                        Math.abs(y) < 6 ? "middle" : y > 0 ? "hanging" : "auto"
                      }
                      onMouseEnter={() => setHover(i)}
                    >
                      {group.label.length > 9
                        ? `${group.label.slice(0, 8)}…`
                        : group.label}
                    </text>
                  );
                })
              : null}
          </g>
        </svg>
      </div>

      {showRows ? (
        <div className={styles["ring-rows"]}>
          {groups.map((group, i) => (
            // biome-ignore lint/a11y/noStaticElementInteractions: hover-only mirror of the radar vertices; the values are already visible in the row.
            <div
              key={group.key}
              className={styles["ring-row"]}
              data-dim={(hover != null && hover !== i) || undefined}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <span
                className={styles["legend-dot"]}
                style={{ background: group.color }}
              />
              {group.source ? (
                <BrandTile source={group.source} size={14} />
              ) : null}
              <span className={styles["ring-row-label"]}>{group.label}</span>
              <span className={styles["ring-row-value"]}>{group.display}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
