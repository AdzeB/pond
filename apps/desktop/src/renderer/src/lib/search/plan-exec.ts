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

// The deterministic query-plan executor: runs a validated QueryPlan over a
// candidate pool entirely in the renderer (where the saves + embeddings live).
// Pipeline: filter -> rank -> group (+ per-group sample) -> aggregate. The global
// `limit` is intentionally NOT applied here; callers apply it after any anchor
// pinning so pinned items survive the cap (see useAsk). Pure and side-effect free.

interface PlanExecContext {
  // Candidate set to run the plan over (already restricted to live saves, or to
  // a previous turn's result set when refining).
  pool: ReadonlyArray<Save>;
  // Query embedding (text/anchor/blended) for semantic ranking, when available.
  rankVector: Float32Array | null;
  // Leftover free-text the compiler couldn't turn into a filter, for keyword
  // ranking. Falls back to the whole question for pure free-text asks.
  residualText: string;
  question: string;
}

interface PlanGroup {
  key: string;
  label: string;
  ids: string[];
}

// Aggregate facts surfaced for "how many …" style answers (no grid needed).
interface PlanFacts {
  total: number;
  groups?: { key: string; label: string; count: number }[];
}

export interface PlanResult {
  // Ordered, de-duplicated save ids after filter/rank/group (pre global limit).
  ids: string[];
  // Present only when the plan groups; the sampled members per group, in order.
  groups: PlanGroup[];
  // Present only when the plan requests an aggregate.
  facts: PlanFacts | null;
}

const DEFAULT_DATE_BUCKET: DateBucket = "month";
// Round-robin / block sampling never needs more than the pool; this bounds the
// per-group default when a group is requested without an explicit perGroup.
const UNCAPPED = Number.POSITIVE_INFINITY;

function hasPredicates(plan: QueryPlan): boolean {
  return plan.filter.rules.length > 0;
}

// Order the filtered set per the plan's RankSpec. "relevance" mirrors the
// original useAsk decision tree (vector -> semantic/by-vector -> keyword floor);
// "field" overrides with an explicit numeric/date sort.
function rankCandidates(
  filtered: ReadonlyArray<Save>,
  plan: QueryPlan,
  ctx: PlanExecContext,
): Save[] {
  const relevance = rankRelevance(filtered, plan, ctx);
  if (plan.rank?.kind === "field") {
    return sortByField(relevance, plan.rank.field, plan.rank.dir);
  }
  return relevance;
}

function rankRelevance(
  candidates: ReadonlyArray<Save>,
  plan: QueryPlan,
  ctx: PlanExecContext,
): Save[] {
  const preds = hasPredicates(plan);
  const residualText = ctx.residualText.trim();
  const freeText = residualText || ctx.question.trim();

  if (ctx.rankVector) {
    let ordered = preds
      ? rankByVector(candidates, ctx.rankVector)
      : rankSemantic(candidates, ctx.rankVector);
    if (ordered.length === 0 && freeText) {
      ordered = rankByKeyword(candidates, freeText).matches;
    }
    return ordered;
  }
  if (preds && residualText) {
    const { matches: hits, rest } = rankByKeyword(candidates, residualText);
    return [...hits, ...rest];
  }
  if (preds) return [...candidates];
  if (freeText) return rankByKeyword(candidates, freeText).matches;
  return [];
}

// Calendar bucket key for a timestamp, e.g. "2024-06" (month) or "2024-W23"
// (ISO week, via date-fns: RRRR = ISO week-numbering year, II = ISO week).
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

// The group key(s) a save belongs to for a given field. Arrays (tags) yield one
// key per element; date fields yield a single bucket; enum/string fields yield
// their (lowercased) value, with empty values bucketed as "unknown".
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

// Cluster the ranked list by the group field, keep at most `perGroup` per group
// (in ranked order) and at most `maxGroups` groups (first-appearing), then emit
// either concatenated blocks or a round-robin interleave. The final id list is
// de-duplicated (a save can land in several groups via tags).
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

// Round-robin across the group blocks: one from each group, then the next, etc.
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

// Compute aggregate facts over the full filtered set (independent of sampling),
// for count / count-by answers.
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

export function executePlan(plan: QueryPlan, ctx: PlanExecContext): PlanResult {
  const filtered = ctx.pool.filter((save) => matches(plan.filter, save));
  const ranked = rankCandidates(filtered, plan, ctx);
  const { ids, groups } = applyGrouping(ranked, plan);
  const facts = computeFacts(filtered, plan);
  return { ids, groups, facts };
}
