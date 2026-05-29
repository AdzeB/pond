import { useMemo } from "react";
import { ALL_SOURCES } from "@/components/settings/sections/_types";
import { useSaves } from "@/pool/hooks";
import styles from "./styles.module.css";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const DAY_LABEL = new Intl.DateTimeFormat(undefined, { weekday: "short" });
const FULL_DAY_LABEL = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "short",
  day: "numeric",
});

interface Bucket {
  start: number;
  end: number;
  count: number;
  label: string;
  tooltip: string;
}

export function Hero() {
  const saves = useSaves();

  const { buckets, total, delta, bySource } = useMemo(() => {
    const now = Date.now();
    const startOfDay = (ts: number) => {
      const d = new Date(ts);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    };
    const todayStart = startOfDay(now);
    const buckets: Bucket[] = Array.from({ length: 7 }, (_, idx) => {
      const start = todayStart - (6 - idx) * DAY_MS;
      const end = start + DAY_MS;
      const date = new Date(start);
      return {
        start,
        end,
        count: 0,
        label: DAY_LABEL.format(date),
        tooltip: FULL_DAY_LABEL.format(date),
      };
    });
    const weekStart = buckets[0]?.start ?? todayStart - 6 * DAY_MS;
    const prevWeekStart = weekStart - WEEK_MS;

    let total = 0;
    let prevTotal = 0;
    const bySourceMap = new Map<string, number>();

    for (const s of saves) {
      if (s.deletedAt) continue;
      if (s.createdAt >= weekStart) {
        total += 1;
        bySourceMap.set(s.source, (bySourceMap.get(s.source) ?? 0) + 1);
        const idx = Math.min(6, Math.floor((s.createdAt - weekStart) / DAY_MS));
        const b = buckets[idx];
        if (b) b.count += 1;
      } else if (s.createdAt >= prevWeekStart) {
        prevTotal += 1;
      }
    }

    const bySource = ALL_SOURCES.map((entry) => ({
      id: entry.id,
      label: entry.label,
      count: bySourceMap.get(entry.id) ?? 0,
    })).sort((a, b) => b.count - a.count);

    return { buckets, total, delta: total - prevTotal, bySource };
  }, [saves]);

  const maxBySource = bySource[0]?.count ?? 0;

  return (
    <section className={styles.hero}>
      <div className={styles.main}>
        <div className={styles.head}>
          <span className={styles.eyebrow}>Saves this week</span>
          <div className={styles["main-figure"]}>
            <span className={styles.value}>{total.toLocaleString()}</span>
            <Delta value={delta} />
          </div>
        </div>
        <Sparkline buckets={buckets} />
      </div>

      <aside className={styles.aside}>
        <span className={styles.eyebrow}>By source</span>
        <ul className={styles.list}>
          {bySource.map((row) => (
            <li
              key={row.id}
              className={styles.row}
              data-empty={row.count === 0}
            >
              <span className={styles["row-label"]}>{row.label}</span>
              <span className={styles["row-bar"]} aria-hidden>
                <span
                  className={styles["row-bar-fill"]}
                  style={{
                    width:
                      maxBySource === 0
                        ? "0%"
                        : `${Math.max(4, (row.count / maxBySource) * 100)}%`,
                  }}
                />
              </span>
              <span className={styles["row-count"]}>
                {row.count.toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </aside>
    </section>
  );
}

function Delta({ value }: { value: number }) {
  if (value === 0) {
    return (
      <span className={styles.delta} data-tone="flat">
        ±0
      </span>
    );
  }
  const tone = value > 0 ? "up" : "down";
  const sign = value > 0 ? "+" : "\u2212";
  return (
    <span className={styles.delta} data-tone={tone}>
      {sign}
      {Math.abs(value).toLocaleString()}
    </span>
  );
}

interface SparklineProps {
  buckets: Bucket[];
}

function Sparkline({ buckets }: SparklineProps) {
  const width = 100;
  const height = 36;
  const peak = Math.max(1, ...buckets.map((b) => b.count));
  const stepX = buckets.length > 1 ? width / (buckets.length - 1) : 0;
  const points = buckets.map((b, i) => {
    const x = i * stepX;
    const y = height - (b.count / peak) * (height - 2) - 1;
    return { x, y };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");

  const areaPath =
    points.length > 0
      ? `${linePath} L${points[points.length - 1]?.x ?? 0} ${height} L${points[0]?.x ?? 0} ${height} Z`
      : "";

  return (
    <div className={styles.sparkline}>
      <svg
        className={styles["sparkline-svg"]}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={buckets
          .map((b) => `${b.tooltip}: ${b.count} saves`)
          .join("; ")}
      >
        <title>Daily saves over the last 7 days</title>
        <defs>
          <linearGradient id="sparkline-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#sparkline-fade)" />
        <path
          d={linePath}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {points.map((p, i) => {
          const bucket = buckets[i];
          if (!bucket || bucket.count === 0) return null;
          return (
            <circle
              key={bucket.start}
              cx={p.x}
              cy={p.y}
              r="1.6"
              fill="currentColor"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>
      <ol className={styles["sparkline-axis"]}>
        {buckets.map((b) => (
          <li key={b.start} title={b.tooltip}>
            {b.label}
          </li>
        ))}
      </ol>
    </div>
  );
}
