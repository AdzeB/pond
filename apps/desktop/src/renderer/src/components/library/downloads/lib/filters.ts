import { OPS, type Op, SOURCES, type Source } from "@pond/schema/db";
import { sourceLabel } from "@pond/schema/sources";
import type { StatusFilter } from "@/lib/status-feed";
import { STAGE_LABELS } from "@/lib/status-feed";

export const STATUS_OPTIONS: readonly {
  id: StatusFilter;
  label: string;
}[] = [
  { id: "in-progress", label: "In Progress" },
  { id: "failed", label: "Failed" },
  { id: "cancelled", label: "Cancelled" },
  { id: "complete", label: "Completed" },
];

export const SOURCE_OPTIONS: readonly { id: Source; label: string }[] =
  SOURCES.map((id) => ({
    id,
    label: sourceLabel(id),
  }));

export const STAGE_OPTIONS: readonly { id: Op; label: string }[] = OPS.map(
  (op) => ({ id: op, label: STAGE_LABELS[op] }),
);
