import type { CardModel } from "@/components/library-sync-monitor/lib/helpers";
import type { AccountRow } from "@/hooks/use-accounts";
import type { WatchRow } from "@/hooks/use-watches";
import { getSourceDef } from "@/lib/save/sources-registry";
import { formatNumber } from "@/lib/util/format";
import type { SyncSourceStatus } from "@/stores/sync-monitor";

/** The global background-sync cadence, surfaced per-account; it applies to all. */
export const FREQUENCY_OPTIONS = [
  { hours: 1, label: "Every Hour" },
  { hours: 2, label: "Every 2 Hours" },
  { hours: 6, label: "Every 6 Hours" },
  { hours: 12, label: "Every 12 Hours" },
  { hours: 24, label: "Once a Day" },
] as const;

export function accountName(account: AccountRow): string {
  const suffix = account.label ?? (account.handle ? `@${account.handle}` : "");
  const label = getSourceDef(account.source).label;
  return suffix ? `${label} · ${suffix}` : label;
}

export function watchName(watch: WatchRow): string {
  if (watch.label) return watch.label;
  /** Playlist/list ids are opaque tokens, not handles, so no @ prefix. */
  return watch.kind === "playlist" || watch.kind === "list"
    ? watch.handle
    : `@${watch.handle}`;
}

export function itemCount(count: number): string {
  return `${formatNumber(count)} item${count === 1 ? "" : "s"}`;
}

/** 0..1 while syncing with a known total; null when indeterminate or resting. */
export function syncFraction(
  tone: CardModel["tone"],
  status: SyncSourceStatus | undefined,
): number | null {
  if (tone !== "run") return null;
  const p = status?.progress;
  if (!p?.total) return null;
  return Math.min(1, p.current / p.total);
}
