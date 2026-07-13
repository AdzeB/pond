import type { InsightVizOptions } from "@pond/schema/db";
import { curveLinear, curveMonotoneX, curveStepAfter } from "@visx/curve";
import { Area, LinePath } from "@visx/shape";
import { useId, useMemo, useRef, useState } from "react";
import styles from "../../styles.module.css";
import { ChartTip, Gridlines, labelStep, niceCeil } from "../charts";
import { formatCount, type InsightResult } from "../insights";
import { layerVisible } from "../layers";
import { useMeasure } from "./use-measure";

/** The mount reveal is a CSS clip animation so an interrupted mount can't strand the chart invisible. */

const ACCENT = "var(--ds-accent-9)";

const CURVES = {
  smooth: curveMonotoneX,
  linear: curveLinear,
  step: curveStepAfter,
} as const;

interface SeriesPoint {
  x: number;
  y0: number;
  y1: number;
}

interface Series {
  key: string;
  color: string;
  points: SeriesPoint[];
}

/** Unsegmented data becomes a single accent-colored series. */
function buildSeries(data: InsightResult, stacked: boolean): Series[] {
  const n = data.groups.length;
  if (data.legend.length === 0) {
    return [
      {
        key: "__all__",
        color: ACCENT,
        points: data.groups.map((g, i) => ({ x: i, y0: 0, y1: g.value })),
      },
    ];
  }
  const running = new Array<number>(n).fill(0);
  return data.legend.map((def) => {
    const points = data.groups.map((group, i) => {
      const value = group.segments.find((s) => s.key === def.key)?.value ?? 0;
      const y0 = stacked ? (running[i] ?? 0) : 0;
      if (stacked) running[i] = y0 + value;
      return { x: i, y0, y1: y0 + value };
    });
    return { key: def.key, color: def.color, points };
  });
}

export function AreaLineChart({
  data,
  mode,
  viz,
}: {
  data: InsightResult;
  mode: "area" | "line";
  viz?: InsightVizOptions;
}) {
  const plotRef = useRef<HTMLDivElement>(null);
  const { width, height } = useMeasure(plotRef);
  const [hover, setHover] = useState<number | null>(null);
  const uid = useId();

  const stacked = mode === "area";
  const curve = CURVES[viz?.curve ?? "smooth"];
  const fill = viz?.fill ?? "gradient";
  const showPoints = layerVisible(mode, viz, "points");
  const showFill = mode === "area" && layerVisible(mode, viz, "fill");
  const showLine = layerVisible(mode, viz, "line");
  const showGrid = layerVisible(mode, viz, "grid");
  const showXAxis = layerVisible(mode, viz, "x-axis");
  const showTip = layerVisible(mode, viz, "tooltip");
  const lineWidth = viz?.lineWidth ?? 1.75;
  /** Scales the gradient's top stop or the dot alpha. */
  const fillAlpha = viz?.fillOpacity;

  const series = useMemo(() => buildSeries(data, stacked), [data, stacked]);
  const n = Math.max(data.groups.length, 1);
  const dataMax = series.reduce(
    (m, s) => s.points.reduce((mm, p) => Math.max(mm, p.y1), m),
    0,
  );
  const max = niceCeil(dataMax);
  const step = labelStep(data.groups.length);

  const xAt = (i: number) => ((i + 0.5) / n) * width;
  const yAt = (v: number) => height - (v / max) * height;

  const hovered = hover != null ? data.groups[hover] : null;
  const hoverTop = series.reduce(
    (m, s) => (hover != null ? Math.max(m, s.points[hover]?.y1 ?? 0) : m),
    0,
  );

  /** A single bucket can't make a path; mark every point so the plot isn't empty. */
  const singleGroup = data.groups.length === 1;
  const dots = showPoints || singleGroup;

  return (
    <div className={styles.chart}>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: hover-only chart affordance; values are readable in the table display. */}
      <div
        ref={plotRef}
        className={styles["chart-plot"]}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const i = Math.floor(((e.clientX - rect.left) / rect.width) * n);
          setHover(Math.max(0, Math.min(n - 1, i)));
        }}
      >
        {showGrid ? <Gridlines max={max} /> : null}
        {width > 0 && height > 0 && data.groups.length > 0 ? (
          <svg
            className={styles["viz-svg"]}
            width={width}
            height={height}
            role="img"
            aria-label="Time series chart"
          >
            <defs>
              {series.map((s) =>
                fill === "dotted" ? (
                  <pattern
                    key={s.key}
                    id={`${uid}-fill-${s.key}`}
                    width={5}
                    height={5}
                    patternUnits="userSpaceOnUse"
                  >
                    <circle
                      cx={1}
                      cy={1}
                      r={1}
                      fill={s.color}
                      opacity={fillAlpha ?? 0.45}
                    />
                  </pattern>
                ) : (
                  <linearGradient
                    key={s.key}
                    id={`${uid}-fill-${s.key}`}
                    x1="0%"
                    x2="0%"
                    y1="0%"
                    y2="100%"
                  >
                    <stop
                      offset="0%"
                      stopColor={s.color}
                      stopOpacity={fillAlpha ?? 0.35}
                    />
                    <stop
                      offset="100%"
                      stopColor={s.color}
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                ),
              )}
            </defs>
            <g className={styles["viz-sweep"]}>
              {series.map((s) => (
                <g key={s.key}>
                  {showFill ? (
                    <Area<SeriesPoint>
                      data={s.points}
                      curve={curve}
                      x={(d) => xAt(d.x)}
                      y0={(d) => yAt(d.y0)}
                      y1={(d) => yAt(d.y1)}
                      fill={`url(#${uid}-fill-${s.key})`}
                    />
                  ) : null}
                  {showLine ? (
                    <LinePath<SeriesPoint>
                      data={s.points}
                      curve={curve}
                      x={(d) => xAt(d.x)}
                      y={(d) => yAt(d.y1)}
                      stroke={s.color}
                      strokeWidth={lineWidth}
                      strokeLinecap="round"
                    />
                  ) : null}
                  {dots
                    ? s.points.map((p) =>
                        p.y1 - p.y0 > 0 || singleGroup ? (
                          <circle
                            key={p.x}
                            cx={xAt(p.x)}
                            cy={yAt(p.y1)}
                            r={2.5}
                            fill={s.color}
                          />
                        ) : null,
                      )
                    : null}
                </g>
              ))}
            </g>
            {hover != null && showTip ? (
              <g>
                <line
                  className={styles["viz-rule"]}
                  x1={xAt(hover)}
                  x2={xAt(hover)}
                  y1={0}
                  y2={height}
                />
                {series.map((s) => {
                  const p = s.points[hover];
                  if (!p || p.y1 - p.y0 <= 0) return null;
                  return (
                    <circle
                      key={s.key}
                      cx={xAt(hover)}
                      cy={yAt(p.y1)}
                      r={3}
                      fill={s.color}
                      stroke="var(--surface, var(--ds-gray-1))"
                      strokeWidth={1.5}
                    />
                  );
                })}
              </g>
            ) : null}
          </svg>
        ) : null}
        {hovered && hover != null && showTip ? (
          <ChartTip
            x={((hover + 0.5) / n) * 100}
            y={Math.min((hoverTop / max) * 100, 92)}
          >
            <div className={styles["tip-title"]}>
              <span>{hovered.label}</span>
              <span>{hovered.display}</span>
            </div>
            {hovered.segments.map((seg) => (
              <div key={seg.key} className={styles["tip-row"]}>
                <span
                  className={styles["legend-dot"]}
                  style={{ background: seg.color }}
                />
                <span className={styles["tip-label"]}>{seg.label}</span>
                <span className={styles["tip-value"]}>
                  {formatCount(seg.value)}
                </span>
                <span className={styles["tip-pct"]}>
                  {hovered.value > 0
                    ? `${Math.round((seg.value / hovered.value) * 1000) / 10}%`
                    : ""}
                </span>
              </div>
            ))}
          </ChartTip>
        ) : null}
      </div>
      {showXAxis ? (
        <div className={styles["chart-x"]}>
          {data.groups.map((group, i) => (
            <span
              key={group.key}
              className={styles["chart-x-label"]}
              data-hover={hover === i || undefined}
            >
              {i % step === 0 || hover === i ? group.label : ""}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
