import { OPS, type Op, SOURCES, type Source } from "@pond/schema/db";
import { sourceLabel } from "@pond/schema/sources";
import { STAGE_LABELS } from "@/features/downloads/lib/status-feed";

export const SOURCE_OPTIONS: readonly { id: Source; label: string }[] =
  SOURCES.map((id) => ({
    id,
    label: sourceLabel(id),
  }));

export const STAGE_OPTIONS: readonly { id: Op; label: string }[] = OPS.map(
  (op) => ({ id: op, label: STAGE_LABELS[op] }),
);
