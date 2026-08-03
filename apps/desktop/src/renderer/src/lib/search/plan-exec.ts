import type { DateBucket, GroupableField, QueryPlan } from "@pond/schema";
import { FIELD_DESCRIPTORS } from "@pond/schema/filters/fields";
import { matches } from "@pond/schema/filters/match";
import { format } from "date-fns";
import type { Save } from "@/lib/types";
import {
  rankByKeyword,
  rankByVector,
  rankSemantic,
  sortByField,
} from "./ranking";

/**
 * Deterministic query-plan executor: filter -> rank -> group (+ per-group sample) -> aggregate, run entirely in the renderer where the saves and embeddings live.
 * @remarks The global `limit` is intentionally not applied here; callers apply it after anchor pinning so pinned items survive the cap.
 */

interface PlanExecContext {
  /** Candidate set: live saves, or a previous turn's result set when refining. */
  pool: ReadonlyArray<Save>;
  /** Query embedding (text/anchor/blended) for semantic ranking, when available. */
  rankVector: Float32Array | null;
  /** Leftover free-text the compiler couldn't turn into a filter; falls back to the whole question for pure free-text asks. */
  residualText: string;
  question: string;
}

interface PlanGroup {
  key: string;
  label: string;
  ids: string[];
}

/** Aggregate facts surfaced for "how many …" style answers, no grid needed. */
interface PlanFacts {
  total: number;
  groups?: { key: string; label: string; count: number }[];
}

export interface PlanResult {
  /** Ordered, de-duplicated save ids after filter/rank/group, pre global limit. */
  ids: string[];
  /** Present only when the plan groups; the sampled members per group, in order. */
  groups: PlanGroup[];
  /** Present only when the plan requests an aggregate. */
  facts: PlanFacts | null;
}

const DEFAULT_DATE_BUCKET: DateBucket = "month";
/** Per-group default when a group is requested without an explicit perGroup. */
const UNCAPPED = Number.POSITIVE_INFINITY;

function hasPredicates(plan: QueryPlan): boolean {
  return plan.filter.rules.length > 0;
}

/** "relevance" follows the useAsk decision tree (vector -> semantic/by-vector -> keyword floor); "field" overrides with an explicit numeric/date sort. */
async function rankCandidates(
  filtered: ReadonlyArray<Save>,
  plan: QueryPlan,
  ctx: PlanExecContext,
): Promise<Save[]> {
  const relevance = await rankRelevance(filtered, plan, ctx);
  if (plan.rank?.kind === "field") {
    return sortByField(relevance, plan.rank.field, plan.rank.dir);
  }
  return relevance;
}

async function rankRelevance(
  candidates: ReadonlyArray<Save>,
  plan: QueryPlan,
  ctx: PlanExecContext,
): Promise<Save[]> {
  const preds = hasPredicates(plan);
  const residualText = ctx.residualText.trim();
  const freeText = residualText || ctx.question.trim();

  if (ctx.rankVector) {
    let ordered = preds
      ? rankByVector(candidates, ctx.rankVector)
      : rankSemantic(candidates, ctx.rankVector);
    if (ordered.length === 0 && freeText) {
      ordered = (await rankByKeyword(candidates, freeText)).matches;
    }
    return ordered;
  }
  if (preds && residualText) {
    const { matches: hits, rest } = await rankByKeyword(
      candidates,
      residualText,
    );
    return [...hits, ...rest];
  }
  if (preds) return [...candidates];
  if (freeText) return (await rankByKeyword(candidates, freeText)).matches;
  return [];
}

/** In date-fns, RRRR is the ISO week-numbering year and II the ISO week, giving "2024-W23". */
function bucketKey(ms: number, bucket: DateBucket): string {
  const d = new Date(ms);
  switch (bucket) {
    case "year":
      return format(d, "yyyy");
    case "month":
      return format(d, "yyyy-MM");
    case "day":
      return format(d, "yyyy-MM-dd");
    case "week":
      return format(d, "RRRR-'W'II");
  }
}

/** Arrays (tags) yield one key per element; date fields a single bucket; enum/string fields their value, with empty values bucketed as "unknown". */
function groupKeysFor(
  save: Save,
  by: GroupableField,
  bucket: DateBucket | undefined,
): string[] {
  const descriptor = FIELD_DESCRIPTORS[by];
  const projected = descriptor.project(save);
  if (Array.isArray(projected)) {
    return projected.map((v) => String(v)).filter((v) => v.length > 0);
  }
  if (descriptor.type === "date") {
    return typeof projected === "number" && Number.isFinite(projected)
      ? [bucketKey(projected, bucket ?? DEFAULT_DATE_BUCKET)]
      : [];
  }
  const value = projected == null ? "" : String(projected);
  return [value.length > 0 ? value : "unknown"];
}

interface GroupingResult {
  ids: string[];
  groups: PlanGroup[];
}

/** The final id list is de-duplicated because a save can land in several groups via tags. */
function applyGrouping(
  ranked: ReadonlyArray<Save>,
  plan: QueryPlan,
): GroupingResult {
  const group = plan.group;
  if (!group) {
    return { ids: dedupeIds(ranked.map((s) => s.id)), groups: [] };
  }

  const order: string[] = [];
  const byKey = new Map<string, Save[]>();
  for (const save of ranked) {
    for (const key of groupKeysFor(save, group.by, group.bucket)) {
      let bucket = byKey.get(key);
      if (!bucket) {
        bucket = [];
        byKey.set(key, bucket);
        order.push(key);
      }
      bucket.push(save);
    }
  }

  const keptKeys =
    group.maxGroups != null ? order.slice(0, group.maxGroups) : order;
  const perGroup = group.perGroup != null ? group.perGroup : UNCAPPED;

  const blocks = keptKeys.map((key) => ({
    key,
    saves: (byKey.get(key) ?? []).slice(0, perGroup),
  }));

  const groups: PlanGroup[] = blocks.map(({ key, saves }) => ({
    key,
    label: key,
    ids: saves.map((s) => s.id),
  }));

  const ordered: string[] = group.interleave
    ? interleave(blocks.map((b) => b.saves))
    : blocks.flatMap((b) => b.saves.map((s) => s.id));

  return { ids: dedupeIds(ordered), groups };
}

function interleave(blocks: Save[][]): string[] {
  const out: string[] = [];
  const max = blocks.reduce((n, b) => Math.max(n, b.length), 0);
  for (let i = 0; i < max; i += 1) {
    for (const block of blocks) {
      const save = block[i];
      if (save) out.push(save.id);
    }
  }
  return out;
}

function dedupeIds(ids: ReadonlyArray<string>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/** Facts are computed over the full filtered set, independent of sampling. */
function computeFacts(
  filtered: ReadonlyArray<Save>,
  plan: QueryPlan,
): PlanFacts | null {
  const aggregate = plan.aggregate;
  if (!aggregate) return null;
  const facts: PlanFacts = { total: filtered.length };
  if (aggregate.countBy) {
    const counts = new Map<string, number>();
    for (const save of filtered) {
      for (const key of groupKeysFor(save, aggregate.countBy, undefined)) {
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    facts.groups = [...counts.entries()]
      .map(([key, count]) => ({ key, label: key, count }))
      .sort((a, b) => b.count - a.count);
  }
  return facts;
}

export async function executePlan(
  plan: QueryPlan,
  ctx: PlanExecContext,
): Promise<PlanResult> {
  const filtered = ctx.pool.filter((save) => matches(plan.filter, save));
  const ranked = await rankCandidates(filtered, plan, ctx);
  const { ids, groups } = applyGrouping(ranked, plan);
  const facts = computeFacts(filtered, plan);
  return { ids, groups, facts };
}
