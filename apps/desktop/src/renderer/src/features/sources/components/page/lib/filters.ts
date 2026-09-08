import type { Source } from "@pond/schema/db";
import type { CardModel } from "@/features/sources/components/sync-monitor/lib/helpers";

export type SourceKind = "account" | "watch";

export type SourceStatusId =
  | "active"
  | "syncing"
  | "failed"
  | "paused"
  | "offline";

export interface SourceFilters {
  q: string;
}

export interface FilterableSource {
  name: string;
  handle: string | null;
  source: Source;
  sourceLabel: string;
  kind: SourceKind;
  statusId: SourceStatusId;
}

export function defaultSourceFilters(): SourceFilters {
  return { q: "" };
}

const STATUS_OPTIONS: readonly { id: SourceStatusId; label: string }[] = [
  { id: "active", label: "Active" },
  { id: "syncing", label: "Syncing" },
  { id: "failed", label: "Failed" },
  { id: "paused", label: "Paused" },
  { id: "offline", label: "Offline" },
];

export function sourceStatusId(
  tone: CardModel["tone"],
  connected: boolean,
): SourceStatusId {
  if (tone === "run") return "syncing";
  if (tone === "err") return "failed";
  if (tone === "paused") return "paused";
  if (!connected) return "offline";
  return "active";
}

export function sourceStatusLabel(id: SourceStatusId): string {
  return STATUS_OPTIONS.find((opt) => opt.id === id)?.label ?? id;
}

export function matchesSourceFilters(
  row: FilterableSource,
  filters: SourceFilters,
): boolean {
  const q = filters.q.trim().toLowerCase();
  if (!q) return true;
  const hay = [row.name, row.handle, row.sourceLabel]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}
