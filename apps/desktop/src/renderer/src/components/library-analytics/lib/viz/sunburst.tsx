import type { InsightVizOptions } from "@pond/schema/db";
import { arc as arcGenerator } from "@visx/shape";
import { motion } from "motion/react";
import { useState } from "react";
import { BrandTile } from "@/components/library-sync-monitor-source-tile";
import styles from "../../styles.module.css";
import type { InsightGroup, InsightResult } from "../insights";
import { layerVisible } from "../layers";

/** The outer ring keeps angular alignment with the inner slice so parent and children read as one wedge; without a segment it degrades to a plain ring. */

const SIZE = 148;
const INNER_THICKNESS = 15;
const RING_GAP = 3;
const PAD_ANGLE = 0.02;

interface Arc {
  start: number;
  end: number;
  /** Inner arcs point at the group; outer arcs also carry their segment. */
  group: InsightGroup;
  segment: InsightGroup["segments"][number] | null;
  color: string;
  label: string;
  display: string;
  pct: number;
}

function buildArcs(data: InsightResult): { inner: Arc[]; outer: Arc[] } {
  const groups = data.groups.filter((g) => g.value > 0);
  const total = groups.reduce((acc, g) => acc + g.value, 0);
  if (total <= 0) return { inner: [], outer: [] };

  const inner: Arc[] = [];
  const outer: Arc[] = [];
  let angle = 0;
  for (const group of groups) {
    const span = (group.value / total) * Math.PI * 2;
    inner.push({
      start: angle,
      end: angle + span,
      group,
      segment: null,
      color: group.color,
      label: group.label,
      display: group.display,
      pct: Math.round((group.value / total) * 1000) / 10,
    });
    let childAngle = angle;
    for (const segment of group.segments) {
      const childSpan = (segment.value / group.value) * span;
      outer.push({
        start: childAngle,
        end: childAngle + childSpan,
        group,
        segment,
        color: segment.color,
        label: `${group.label} · ${segment.label}`,
        display: segment.value.toLocaleString(),
        pct: Math.round((segment.value / total) * 1000) / 10,
      });
      childAngle += childSpan;
    }
    angle += span;
  }
  return { inner, outer };
}

export function SunburstChart({
  data,
  viz,
}: {
  data: InsightResult;
  viz?: InsightVizOptions;
}) {
  const [hover, setHover] = useState<Arc | null>(null);
  const built = buildArcs(data);
  const inner = built.inner;
  const showOuter = layerVisible("sunburst", viz, "outer");
  const outer = showOuter ? built.outer : [];
  const showCenter = layerVisible("sunburst", viz, "center");
  const showRows = layerVisible("sunburst", viz, "rows");
  const r = SIZE / 2;
  /** The thickness knob drives the inner band; the outer ring stays slimmer, matching the default 15/13 relationship. */
  const innerThickness = viz?.thickness ?? INNER_THICKNESS;
  const outerThickness = Math.max(innerThickness - 2, 4);

  if (inner.length === 0) {
    return <div className={styles["viz-empty"]}>No data in this window</div>;
  }

  const innerOuterRadius =
    r - (outer.length > 0 ? outerThickness + RING_GAP : 0);
  const innerGen = arcGenerator<Arc>({
    innerRadius: Math.max(innerOuterRadius - innerThickness, 4),
    outerRadius: innerOuterRadius,
    cornerRadius: inner.length > 1 ? 2 : 0,
    padAngle: inner.length > 1 ? PAD_ANGLE : 0,
    startAngle: (d) => d.start,
    endAngle: (d) => d.end,
  });
  const outerGen = arcGenerator<Arc>({
    innerRadius: r - outerThickness,
    outerRadius: r,
    cornerRadius: outer.length > 1 ? 2 : 0,
    padAngle: outer.length > 1 ? PAD_ANGLE : 0,
    startAngle: (d) => d.start,
    endAngle: (d) => d.end,
  });

  /** Hovering an inner wedge lights it plus its children; hovering an outer arc lights just that arc and its parent. */
  const isLit = (arc: Arc) => {
    if (!hover) return true;
    if (arc.group !== hover.group) return false;
    if (!hover.segment || !arc.segment) return true;
    return arc.segment === hover.segment;
  };

  const renderArcs = (arcs: Arc[], gen: typeof innerGen) =>
    arcs.map((arc) => (
      <motion.path
        key={`${arc.group.key}:${arc.segment?.key ?? ""}`}
        d={gen(arc) ?? ""}
        fill={arc.color}
        animate={{ opacity: isLit(arc) ? 1 : 0.3 }}
        transition={{ duration: 0.15 }}
        onMouseEnter={() => setHover(arc)}
      />
    ));

  return (
    <div className={styles["ring-layout"]}>
      <div className={styles["ring-figure"]}>
        <svg
          className={styles["viz-wheel"]}
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label="Sunburst chart"
          onMouseLeave={() => setHover(null)}
        >
          <g transform={`translate(${r} ${r})`}>
            {renderArcs(inner, innerGen)}
            {renderArcs(outer, outerGen)}
          </g>
        </svg>
        {showCenter ? (
          <div className={styles["ring-center"]}>
            <span className={styles["ring-total"]}>
              {hover ? hover.display : data.totalDisplay}
            </span>
            <span className={styles["ring-caption"]}>
              {hover ? hover.label : "Total"}
            </span>
          </div>
        ) : null}
      </div>

      {showRows ? (
        <div className={styles["ring-rows"]}>
          {inner.map((arc) => (
            // biome-ignore lint/a11y/noStaticElementInteractions: hover-only mirror of the wheel; the values are already visible in the row.
            <div
              key={arc.group.key}
              className={styles["ring-row"]}
              data-dim={
                (hover != null && hover.group !== arc.group) || undefined
              }
              onMouseEnter={() => setHover(arc)}
              onMouseLeave={() => setHover(null)}
            >
              <span
                className={styles["legend-dot"]}
                style={{ background: arc.color }}
              />
              {arc.group.source ? (
                <BrandTile source={arc.group.source} size={14} />
              ) : null}
              <span className={styles["ring-row-label"]}>{arc.label}</span>
              <span className={styles["ring-row-value"]}>{arc.display}</span>
              <span className={styles["ring-row-pct"]}>{arc.pct}%</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
