import type { CardModel } from "@/features/sources/components/sync-monitor/lib/helpers";
import type { AccountRow } from "@/features/sources/hooks/use-accounts";
import {
  type WatchRow,
  watchKindLabel,
} from "@/features/sources/hooks/use-watches";
import { getSourceDef } from "@/features/sources/lib/registry";
import {
  type FilterableSource,
  sourceStatusId,
  sourceStatusLabel,
} from "./filters";

export type SourceEntry =
  | { kind: "account"; row: AccountRow }
  | { kind: "watch"; row: WatchRow };

export interface SourceTableRow extends FilterableSource {
  id: string;
  avatarUrl: string | null | undefined;
  items: number;
  lastSyncedAt: string | null;
  lastSyncedMs: number;
  statusLabel: string;
  kindLabel: string;
  model: CardModel;
  entry: SourceEntry;
}

export function accountName(account: AccountRow): string {
  const suffix = account.label ?? (account.handle ? `@${account.handle}` : "");
  const label = getSourceDef(account.source).label;
  return suffix ? `${label} · ${suffix}` : label;
}

export function watchName(watch: WatchRow): string {
  if (watch.label) return watch.label;
  return watch.kind === "playlist" || watch.kind === "list"
    ? watch.handle
    : `@${watch.handle}`;
}

function sourceRowName(entry: SourceEntry): string {
  if (entry.kind === "account") {
    if (entry.row.label) return entry.row.label;
    if (entry.row.handle) return `@${entry.row.handle}`;
    return getSourceDef(entry.row.source).label;
  }
  return watchName(entry.row);
}

function typeLabel(entry: SourceEntry): string {
  if (entry.kind === "account") return "Account";
  const kind = watchKindLabel(entry.row.kind);
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}

export function sourceCanSyncNow(row: SourceTableRow): boolean {
  const running = row.model.tone === "run";
  if (row.kind === "account") return row.model.connected && !running;
  return !running;
}

export function toSourceTableRow(
  entry: SourceEntry,
  model: CardModel,
): SourceTableRow {
  const statusId = sourceStatusId(model.tone, model.connected);
  const lastSyncedAt = entry.row.sync?.lastSyncedAt ?? null;
  const lastSyncedMs = lastSyncedAt
    ? new Date(lastSyncedAt).getTime()
    : Number.NEGATIVE_INFINITY;
  return {
    id: entry.row.id,
    kind: entry.kind,
    source: entry.row.source,
    name: sourceRowName(entry),
    handle: entry.row.handle,
    avatarUrl: entry.row.avatarUrl,
    items: entry.row.sync?.knownCount ?? 0,
    lastSyncedAt,
    lastSyncedMs,
    statusId,
    statusLabel: sourceStatusLabel(statusId),
    sourceLabel: getSourceDef(entry.row.source).label,
    kindLabel: typeLabel(entry),
    model,
    entry,
  };
}
