import type { InsightVizOptions } from "@pond/schema/db";
import { useState } from "react";
import { BrandTile } from "@/components/library-sync-monitor-source-tile";
import styles from "../styles.module.css";
import { formatCount, type InsightResult } from "./insights";
import { layerVisible } from "./layers";

// Hand-rolled chart primitives for insight cards. Bars are plain positioned
// divs (no chart library), scaled against a "nice" rounded axis max so
// gridline labels stay readable. Hover state drives custom tooltips
// (Linear-style) instead of native title text.

export function niceCeil(value: number): number {
  if (value <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(value));
  const unit = value / pow;
  const nice = unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10;
  return nice * pow;
}

// Thin every Nth x label so long day ranges don't collide.
export function labelStep(count: number): number {
  return Math.max(1, Math.ceil(count / 10));
}

export function Gridlines({ max }: { max: number }) {
  return (
    <>
      {[1, 0.5, 0].map((f) => (
        <div
          key={f}
          className={styles.gridline}
          style={{ bottom: `${f * 100}%` }}
        >
          <span className={styles["gridline-label"]}>
            {formatCount(max * f)}
          </span>
        </div>
      ))}
    </>
  );
}

// Anchored tooltip inside the plot; flips horizontal alignment past midpoint.
export function ChartTip({
  x,
  y,
  children,
}: {
  x: number;
  y: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className={styles.tip}
      data-side={x > 55 ? "left" : "right"}
      style={{ left: `${x}%`, bottom: `${Math.min(y + 4, 96)}%` }}
    >
      {children}
    </div>
  );
}

// ── Stacked column chart ────────────────────────────────────────────────────

export function BarChart({
  data,
  viz,
}: {
  data: InsightResult;
  viz?: InsightVizOptions;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceCeil(data.groups.reduce((m, g) => Math.max(m, g.value), 0));
  const step = labelStep(data.groups.length);
  const n = Math.max(data.groups.length, 1);
  const hovered = hover != null ? data.groups[hover] : null;
  const segRadius = viz?.barCap === "square" ? 0 : undefined;

  return (
    <div className={styles.chart}>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: hover-only chart affordance; values are readable in the tooltip and table display. */}
      <div className={styles["chart-plot"]} onMouseLeave={() => setHover(null)}>
        {layerVisible("chart", viz, "grid") ? <Gridlines max={max} /> : null}
        <div className={styles["chart-cols"]}>
          {data.groups.map((group, i) => (
            // biome-ignore lint/a11y/noStaticElementInteractions: hover-only chart affordance.
            <div
              key={group.key}
              className={styles["chart-col"]}
              data-hover={hover === i || undefined}
              onMouseEnter={() => setHover(i)}
            >
              {group.segments.length > 0 ? (
                group.segments.map((seg) => (
                  <span
                    key={seg.key}
                    className={styles["chart-seg"]}
                    style={{
                      height: `${(seg.value / max) * 100}%`,
                      background: seg.color,
                      borderRadius: segRadius,
                    }}
                  />
                ))
              ) : (
                <span
                  className={styles["chart-seg"]}
                  style={{
                    height: `${(group.value / max) * 100}%`,
                    background: "var(--ds-accent-9)",
                    borderRadius: segRadius,
                  }}
                />
              )}
            </div>
          ))}
        </div>
        {hovered && hover != null && layerVisible("chart", viz, "tooltip") ? (
          <ChartTip
            x={((hover + 0.5) / n) * 100}
            y={Math.min((hovered.value / max) * 100, 92)}
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
      {layerVisible("chart", viz, "x-axis") ? (
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

// ── Single headline number ──────────────────────────────────────────────────

export function MetricBlock({
  data,
  days,
}: {
  data: InsightResult;
  days: number;
}) {
  return (
    <div className={styles.metric}>
      <span className={styles["metric-value"]}>{data.totalDisplay}</span>
      <span className={styles["metric-sub"]}>
        {data.saveCount.toLocaleString()} save
        {data.saveCount === 1 ? "" : "s"} · {windowLabel(days)}
      </span>
    </div>
  );
}

export function windowLabel(days: number): string {
  if (days === 0) return "all time";
  return days === 1 ? "last day" : `last ${days} days`;
}

// ── Ranked value table ──────────────────────────────────────────────────────
// Unsegmented: label / value / proportional bar rows. Segmented: pivots the
// legend into columns (Linear's "by team and priority" table).

export function ValueTable({ data }: { data: InsightResult }) {
  if (data.legend.length > 0) {
    return (
      <div className={styles["pivot-scroll"]}>
        <table className={styles.pivot}>
          <thead>
            <tr>
              <th className={styles["pivot-lead"]} />
              <th>Total</th>
              {data.legend.map((seg) => (
                <th key={seg.key}>
                  <span className={styles["legend-item"]}>
                    <span
                      className={styles["legend-dot"]}
                      style={{ background: seg.color }}
                    />
                    {seg.label}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.groups.slice(0, 12).map((group) => {
              const byKey = new Map(
                group.segments.map((s) => [s.key, s.value]),
              );
              return (
                <tr key={group.key}>
                  <td className={styles["pivot-lead"]}>
                    <span className={styles["pivot-name"]}>
                      {group.source ? (
                        <BrandTile source={group.source} size={16} />
                      ) : null}
                      {group.label}
                    </span>
                  </td>
                  <td>{group.display}</td>
                  {data.legend.map((seg) => {
                    const v = byKey.get(seg.key) ?? 0;
                    return (
                      <td key={seg.key} data-zero={v === 0 || undefined}>
                        {formatCount(v)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  const max = data.groups.reduce((m, g) => Math.max(m, g.value), 0);
  return (
    <div className={styles["value-rows"]}>
      {data.groups.slice(0, 8).map((group) => (
        <div key={group.key} className={styles["value-row"]}>
          {group.source ? <BrandTile source={group.source} size={18} /> : null}
          <span className={styles["value-label"]}>{group.label}</span>
          <span className={styles["value-num"]}>{group.display}</span>
          <span className={styles["value-track"]}>
            <span
              className={styles["value-fill"]}
              style={{
                width: `${max > 0 ? Math.max(3, Math.round((group.value / max) * 100)) : 0}%`,
              }}
            />
          </span>
        </div>
      ))}
    </div>
  );
}

// Legend chips shared by chart cards.
export function Legend({ data }: { data: InsightResult }) {
  if (data.legend.length === 0) return null;
  return (
    <div className={styles.legend}>
      {data.legend.map((seg) => (
        <span key={seg.key} className={styles["legend-item"]}>
          <span
            className={styles["legend-dot"]}
            style={{ background: seg.color }}
          />
          {seg.label}
        </span>
      ))}
    </div>
  );
}
