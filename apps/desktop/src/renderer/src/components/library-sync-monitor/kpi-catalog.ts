import type { SyncStats } from "@/hooks/use-sync-stats";
import { formatBytes, formatNumber } from "@/lib/format";
import type { StorageStatus } from "@/stores/storage-status";
import type { SyncRun } from "./helpers";

export type MetricDisplay = "card" | "chip";

export interface MetricContext {
  stats: SyncStats;
  recentRuns: SyncRun[];
  connectedCount: number;
  healthyCount: number;
  totalSources: number;
  storage: StorageStatus | null;
  days: number;
}

export interface MetricValue {
  value: string;
  delta?: { text: string; dir: "up" | "down" | "neutral" };
  spark?: number[];
  tone?: "ok" | "err" | "warn";
}

export interface MetricDef {
  id: string;
  label: string;
  group: "Sync" | "Items" | "Pipeline" | "System";
  description: string;
  defaultDisplay: MetricDisplay;
  compute: (ctx: MetricContext) => MetricValue;
}

function pctDelta(cur: number, prev: number): MetricValue["delta"] {
  if (prev <= 0) {
    return cur > 0
      ? { text: "new this week", dir: "up" }
      : { text: "no change", dir: "neutral" };
  }
  const pct = ((cur - prev) / prev) * 100;
  const rounded = Math.round(pct * 10) / 10;
  if (Math.abs(rounded) < 0.05) return { text: "no change", dir: "neutral" };
  const arrow = rounded > 0 ? "↑" : "↓";
  return {
    text: `${arrow} ${Math.abs(rounded)}% vs last period`,
    dir: rounded > 0 ? "up" : "down",
  };
}

// Bucket a per-run value into `days` daily totals, normalized 0..1 for a sparkline.
function dailySpark(
  runs: SyncRun[],
  days: number,
  pick: (r: SyncRun) => number,
): number[] {
  const dayMs = 86_400_000;
  const now = new Date();
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const buckets = new Array(days).fill(0);
  for (const run of runs) {
    const idx = days - 1 - Math.floor((todayStart - run.ts) / dayMs);
    if (idx >= 0 && idx < days) buckets[idx] += pick(run);
  }
  const max = Math.max(1, ...buckets);
  return buckets.map((b) => b / max);
}

function itemsOf(run: SyncRun): number {
  return run.enqueue?.succeeded ?? run.harvest?.fresh ?? 0;
}

function formatMs(ms: number): string {
  if (ms <= 0) return "0s";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const sec = ms / 1000;
  return sec < 10 ? `${sec.toFixed(1)}s` : `${Math.round(sec)}s`;
}

export const METRIC_CATALOG: MetricDef[] = [
  {
    id: "itemsSynced",
    label: "Items synced",
    group: "Items",
    description: "Total items pulled in over the window",
    defaultDisplay: "card",
    compute: ({ stats, recentRuns, days }) => ({
      value: formatNumber(stats.itemsSynced),
      delta: pctDelta(stats.itemsSynced, stats.itemsSyncedPrev),
      spark: dailySpark(recentRuns, days, itemsOf),
    }),
  },
  {
    id: "newToday",
    label: "New today",
    group: "Items",
    description: "Fresh items added today",
    defaultDisplay: "chip",
    compute: ({ stats }) => ({ value: formatNumber(stats.newToday) }),
  },
  {
    id: "runsToday",
    label: "Runs today",
    group: "Sync",
    description: "Sync runs completed today",
    defaultDisplay: "card",
    compute: ({ stats }) => ({ value: formatNumber(stats.runsToday) }),
  },
  {
    id: "runs",
    label: "Runs",
    group: "Sync",
    description: "Sync runs completed over the window",
    defaultDisplay: "chip",
    compute: ({ stats }) => ({ value: formatNumber(stats.runs) }),
  },
  {
    id: "successRate",
    label: "Success rate",
    group: "Sync",
    description: "Share of runs that completed cleanly",
    defaultDisplay: "card",
    compute: ({ stats }) => {
      const diff = stats.successRate - stats.successRatePrev;
      const delta: MetricValue["delta"] =
        Math.abs(diff) < 0.5
          ? { text: "steady", dir: "neutral" }
          : {
              text: `${diff > 0 ? "↑" : "↓"} ${Math.abs(Math.round(diff))}%`,
              dir: diff > 0 ? "up" : "down",
            };
      return { value: `${stats.successRate}%`, delta };
    },
  },
  {
    id: "avgRun",
    label: "Avg run time",
    group: "Sync",
    description: "Mean duration per run",
    defaultDisplay: "card",
    compute: ({ stats }) => {
      const diff = stats.avgRunMs - stats.avgRunMsPrev;
      const delta: MetricValue["delta"] =
        Math.abs(diff) < 100
          ? { text: "steady", dir: "neutral" }
          : {
              // Faster is good, so a drop reads as "up" (green).
              text: `${diff < 0 ? "↓" : "↑"} ${formatMs(Math.abs(diff))}`,
              dir: diff < 0 ? "up" : "down",
            };
      return { value: formatMs(stats.avgRunMs), delta };
    },
  },
  {
    id: "failed",
    label: "Failed",
    group: "Sync",
    description: "Runs that errored over the window",
    defaultDisplay: "chip",
    compute: ({ stats }) => ({
      value: formatNumber(stats.failed),
      tone: stats.failed > 0 ? "err" : undefined,
    }),
  },
  {
    id: "recovered",
    label: "Recovered",
    group: "Sync",
    description: "Runs the watchdog reset and retried",
    defaultDisplay: "chip",
    compute: ({ stats }) => ({
      value: formatNumber(stats.recovered),
      tone: stats.recovered > 0 ? "warn" : undefined,
    }),
  },
  {
    id: "healthy",
    label: "Healthy sources",
    group: "System",
    description: "Connected sources without errors",
    defaultDisplay: "chip",
    compute: ({ healthyCount, connectedCount }) => ({
      value: `${healthyCount} / ${connectedCount}`,
      tone: healthyCount < connectedCount ? "warn" : "ok",
    }),
  },
  {
    id: "storage",
    label: "Storage used",
    group: "System",
    description: "Pond disk usage versus the cap",
    defaultDisplay: "chip",
    compute: ({ storage }) => {
      if (!storage) return { value: "—" };
      const cap = storage.capBytes ? formatBytes(storage.capBytes) : "∞";
      return {
        value: `${formatBytes(storage.pondBytes)} / ${cap}`,
        tone:
          storage.state === "exceeded"
            ? "err"
            : storage.state === "warn"
              ? "warn"
              : undefined,
      };
    },
  },
];

export const METRIC_BY_ID: Record<string, MetricDef> = Object.fromEntries(
  METRIC_CATALOG.map((m) => [m.id, m]),
);

export const METRIC_GROUPS: MetricDef["group"][] = [
  "Sync",
  "Items",
  "Pipeline",
  "System",
];
