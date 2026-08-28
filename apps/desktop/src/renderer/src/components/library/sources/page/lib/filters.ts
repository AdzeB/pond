import type { Source } from "@pond/schema/db";
import { SOURCES } from "@pond/schema/db";
import { sourceLabel } from "@pond/schema/sources";
import type { CardModel } from "@/components/library/sources/sync-monitor/lib/helpers";

export type SourceKind = "account" | "watch";

export type SourceStatusId =
  | "active"
  | "syncing"
  | "failed"
  | "paused"
  | "offline";

export interface SourceFilters {
  q: string;
  statuses: ReadonlySet<SourceStatusId>;
  sources: ReadonlySet<Source>;
  kinds: ReadonlySet<SourceKind>;
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
  return {
    q: "",
    statuses: new Set(),
    sources: new Set(),
    kinds: new Set(),
  };
}

export const STATUS_OPTIONS: readonly { id: SourceStatusId; label: string }[] =
  [
    { id: "active", label: "Active" },
    { id: "syncing", label: "Syncing" },
    { id: "failed", label: "Failed" },
    { id: "paused", label: "Paused" },
    { id: "offline", label: "Offline" },
  ];

export const KIND_OPTIONS: readonly { id: SourceKind; label: string }[] = [
  { id: "account", label: "Account" },
  { id: "watch", label: "Watch" },
];

export const SOURCE_OPTIONS: readonly { id: Source; label: string }[] =
  SOURCES.map((id) => ({
    id,
    label: sourceLabel(id),
  }));

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

export function selectedSummary<T extends string>(
  selected: ReadonlySet<T>,
  options: readonly { id: T; label: string }[],
): string {
  if (selected.size === 0) return "All";
  const labels = options
    .filter((opt) => selected.has(opt.id))
    .map((opt) => opt.label);
  return labels.length > 0 ? labels.join(", ") : "All";
}

export function sourcesFiltersActive(filters: SourceFilters): boolean {
  return (
    filters.q.trim() !== "" ||
    filters.statuses.size > 0 ||
    filters.sources.size > 0 ||
    filters.kinds.size > 0
  );
}

export function describeSourcesFilters(filters: SourceFilters): string {
  const parts: string[] = [];
  const q = filters.q.trim();
  if (q) parts.push(q);
  if (filters.statuses.size > 0) {
    parts.push(selectedSummary(filters.statuses, STATUS_OPTIONS));
  }
  if (filters.sources.size > 0) {
    parts.push(selectedSummary(filters.sources, SOURCE_OPTIONS));
  }
  if (filters.kinds.size > 0) {
    parts.push(selectedSummary(filters.kinds, KIND_OPTIONS));
  }
  return parts.join(" · ");
}

export function matchesSourceFilters(
  row: FilterableSource,
  filters: SourceFilters,
): boolean {
  if (filters.statuses.size > 0 && !filters.statuses.has(row.statusId)) {
    return false;
  }
  if (filters.sources.size > 0 && !filters.sources.has(row.source)) {
    return false;
  }
  if (filters.kinds.size > 0 && !filters.kinds.has(row.kind)) {
    return false;
  }
  const q = filters.q.trim().toLowerCase();
  if (!q) return true;
  const hay = [row.name, row.handle, row.sourceLabel]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}
