import type { InsightVizOptions } from "@pond/schema/db";
import { arc as arcGenerator } from "@visx/shape";
import { motion } from "motion/react";
import { useState } from "react";
import { BrandTile } from "@/components/library-sync-monitor-source-tile";
import styles from "../../styles.module.css";
import type { InsightGroup, InsightResult } from "../insights";
import { layerVisible } from "../layers";

// Composition donut and pie, ported from Bklit's ring/pie: rounded slice
// corners, hover scale + dim. The ring variant keeps a hollow center with
// the running total; the pie fills the disc and leans on the legend rows.
// The engine caps groups at top 6 + "Other" so the wheel stays legible.

const SIZE = 148;
const THICKNESS = 17;
const PAD_ANGLE = 0.03;

interface Slice {
  group: InsightGroup;
  start: number;
  end: number;
  pct: number;
}

function buildSlices(data: InsightResult): Slice[] {
  const groups = data.groups.filter((g) => g.value > 0);
  const total = groups.reduce((acc, g) => acc + g.value, 0);
  if (total <= 0) return [];
  let angle = 0;
  return groups.map((group) => {
    const span = (group.value / total) * Math.PI * 2;
    const slice: Slice = {
      group,
      start: angle,
      end: angle + span,
      pct: Math.round((group.value / total) * 1000) / 10,
    };
    angle += span;
    return slice;
  });
}

export function RingChart({
  data,
  variant = "ring",
  viz,
}: {
  data: InsightResult;
  variant?: "ring" | "pie";
  viz?: InsightVizOptions;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const slices = buildSlices(data);
  const r = SIZE / 2;
  const thickness = viz?.thickness ?? THICKNESS;
  const showCenter = variant === "ring" && layerVisible(variant, viz, "center");
  const showRows = layerVisible(variant, viz, "rows");

  if (slices.length === 0) {
    return <div className={styles["viz-empty"]}>No data in this window</div>;
  }

  const generator = arcGenerator<Slice>({
    innerRadius: variant === "pie" ? 0 : Math.max(r - thickness, 4),
    outerRadius: r,
    cornerRadius: slices.length > 1 ? 3 : 0,
    padAngle: slices.length > 1 ? PAD_ANGLE : 0,
    startAngle: (d) => d.start,
    endAngle: (d) => d.end,
  });

  const hovered = hover != null ? slices[hover] : null;

  return (
    <div className={styles["ring-layout"]}>
      <div className={styles["ring-figure"]}>
        <svg
          className={styles["viz-wheel"]}
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label={
            variant === "pie"
              ? "Composition pie chart"
              : "Composition ring chart"
          }
          onMouseLeave={() => setHover(null)}
        >
          <g transform={`translate(${r} ${r})`}>
            {slices.map((slice, i) => (
              <motion.path
                key={slice.group.key}
                d={generator(slice) ?? ""}
                fill={slice.group.color}
                initial={{ opacity: 1, scale: 1 }}
                animate={{
                  opacity: hover == null || hover === i ? 1 : 0.35,
                  scale: hover === i ? 1.04 : 1,
                }}
                transition={{
                  scale: { type: "spring", stiffness: 400, damping: 25 },
                  opacity: { duration: 0.15 },
                }}
                style={{ transformOrigin: "0 0" }}
                onMouseEnter={() => setHover(i)}
              />
            ))}
          </g>
        </svg>
        {showCenter ? (
          <div className={styles["ring-center"]}>
            <span className={styles["ring-total"]}>
              {hovered ? hovered.group.display : data.totalDisplay}
            </span>
            <span className={styles["ring-caption"]}>
              {hovered ? hovered.group.label : "Total"}
            </span>
          </div>
        ) : null}
      </div>

      {showRows ? (
        <div className={styles["ring-rows"]}>
          {slices.map((slice, i) => (
            // biome-ignore lint/a11y/noStaticElementInteractions: hover-only mirror of the ring slices; the values are already visible in the row.
            <div
              key={slice.group.key}
              className={styles["ring-row"]}
              data-dim={(hover != null && hover !== i) || undefined}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <span
                className={styles["legend-dot"]}
                style={{ background: slice.group.color }}
              />
              {slice.group.source ? (
                <BrandTile source={slice.group.source} size={14} />
              ) : null}
              <span className={styles["ring-row-label"]}>
                {slice.group.label}
              </span>
              <span className={styles["ring-row-value"]}>
                {slice.group.display}
              </span>
              <span className={styles["ring-row-pct"]}>{slice.pct}%</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
