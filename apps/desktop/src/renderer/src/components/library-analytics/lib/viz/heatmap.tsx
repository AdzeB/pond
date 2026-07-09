import type { InsightVizOptions } from "@pond/schema/db";
import { useState } from "react";
import styles from "../../styles.module.css";
import { formatCount, type InsightResult } from "../insights";
import { layerVisible } from "../layers";

// Weekday × hour activity grid rendered as a plain CSS grid: cell intensity
// is the accent hue with value-scaled alpha, hover shows the exact figure.

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOUR_TICKS = [0, 6, 12, 18];

function hourLabel(hour: number): string {
  if (hour === 0) return "12am";
  if (hour === 12) return "12pm";
  return hour < 12 ? `${hour}am` : `${hour - 12}pm`;
}

export function HeatmapChart({
  data,
  viz,
}: {
  data: InsightResult;
  viz?: InsightVizOptions;
}) {
  const [hover, setHover] = useState<{ day: number; hour: number } | null>(
    null,
  );
  const showLabels = layerVisible("heatmap", viz, "labels");
  const heatmap = data.heatmap;
  if (!heatmap || heatmap.max <= 0) {
    return <div className={styles["viz-empty"]}>No data in this window</div>;
  }

  const hoverValue = hover
    ? (heatmap.cells[hover.day]?.[hover.hour] ?? 0)
    : null;

  return (
    <div className={styles.heatmap}>
      <div className={styles["heatmap-grid"]}>
        {heatmap.cells.map((hours, day) => (
          <div key={WEEKDAYS[day]} className={styles["heatmap-row"]}>
            {showLabels ? (
              <span className={styles["heatmap-day"]}>{WEEKDAYS[day]}</span>
            ) : null}
            {hours.map((value, hour) => {
              const alpha =
                value <= 0 ? 0 : 0.15 + 0.85 * (value / heatmap.max);
              return (
                // biome-ignore lint/a11y/noStaticElementInteractions: hover-only cell affordance; the header line reports the value.
                <span
                  key={`${WEEKDAYS[day]}-${hourLabel(hour)}`}
                  className={styles["heatmap-cell"]}
                  data-hover={
                    (hover?.day === day && hover?.hour === hour) || undefined
                  }
                  style={{
                    background:
                      value <= 0
                        ? "var(--ds-gray-a3)"
                        : `color-mix(in oklab, var(--ds-accent-9) ${Math.round(alpha * 100)}%, transparent)`,
                  }}
                  onMouseEnter={() => setHover({ day, hour })}
                  onMouseLeave={() => setHover(null)}
                />
              );
            })}
          </div>
        ))}
        {showLabels ? (
          <div className={styles["heatmap-row"]} data-axis>
            <span className={styles["heatmap-day"]} />
            {Array.from({ length: 24 }, (_, hour) => (
              <span key={hourLabel(hour)} className={styles["heatmap-hour"]}>
                {HOUR_TICKS.includes(hour) ? hourLabel(hour) : ""}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <div className={styles["heatmap-caption"]}>
        {hover && hoverValue != null
          ? `${WEEKDAYS[hover.day]} · ${hourLabel(hover.hour)} — ${formatCount(hoverValue)} saves`
          : `Peak ${formatCount(heatmap.max)} saves`}
      </div>
    </div>
  );
}
