// The query-plan IR: the richer output the Ask agent compiles to, replacing the
// old "flat filter + one global sort/limit" ceiling. A plan is a small, typed
// pipeline that a deterministic renderer executor runs over the library:
//
//   filter -> rank -> group (+ per-group sample) -> limit -> aggregate
//
// It is intentionally NOT a general program: only these typed steps exist, so a
// model can never make the app execute arbitrary logic. `filter` reuses the
// existing boolean Query tree (re-validated by Stage D); the rest is shape-
// checked here and clamped by the renderer's validatePlan. Shared by the main
// process (which prompts a model to emit a plan) and the renderer (which runs it).

import { z } from "zod";
import type { Query } from "./filters/types";

// Fields a plan can group results by. Enum/string fields group by their value;
// `tags` puts a save in one group per tag; date fields group by a calendar
// bucket (see DateBucket).
export const GROUPABLE_FIELDS = [
  "source",
  "type",
  "creator",
  "tags",
  "savedAt",
  "publishedAt",
  "modifiedAt",
] as const;
export type GroupableField = (typeof GROUPABLE_FIELDS)[number];

// Numeric/date fields a plan can sort by. "relevance" (the other RankSpec arm)
// uses the semantic/keyword ranker instead.
export const SORTABLE_FIELDS = [
  "savedAt",
  "publishedAt",
  "modifiedAt",
  "duration",
  "fileCount",
] as const;
export type SortableField = (typeof SORTABLE_FIELDS)[number];

export const DATE_BUCKETS = ["day", "week", "month", "year"] as const;
export type DateBucket = (typeof DATE_BUCKETS)[number];

// How the filtered set is ordered before grouping/limiting.
export type RankSpec =
  | { kind: "relevance" }
  | { kind: "field"; field: SortableField; dir: "asc" | "desc" };

export interface GroupSpec {
  by: GroupableField;
  // Calendar granularity, only meaningful when `by` is a date field.
  bucket?: DateBucket;
  // Keep at most this many items per group ("a few from each source" -> 3).
  perGroup?: number;
  // Round-robin across groups instead of concatenating whole group blocks.
  interleave?: boolean;
  // Keep at most this many groups (the largest / earliest-appearing ones).
  maxGroups?: number;
}

export interface AggregateSpec {
  // Emit the total match count as a fact (for "how many …" answers).
  count?: boolean;
  // Emit per-group counts as facts (for "how many … by source" answers).
  countBy?: GroupableField;
}

export interface QueryPlan {
  filter: Query;
  rank?: RankSpec;
  group?: GroupSpec;
  limit?: number;
  aggregate?: AggregateSpec;
}

// ---- Lenient parsing of untrusted model output ----------------------------
// `filter` is passed through as unknown and re-validated by the renderer's
// validateQuery (Stage D); everything else is shape-checked here. The renderer's
// validatePlan then clamps numeric bounds. Unknown extra keys are stripped.

const rankSchema = z.union([
  z.object({ kind: z.literal("relevance") }),
  z.object({
    kind: z.literal("field"),
    field: z.enum(SORTABLE_FIELDS),
    dir: z.enum(["asc", "desc"]).catch("desc"),
  }),
]);

const groupSchema = z.object({
  by: z.enum(GROUPABLE_FIELDS),
  bucket: z.enum(DATE_BUCKETS).optional(),
  perGroup: z.number().optional(),
  interleave: z.boolean().optional(),
  maxGroups: z.number().optional(),
});

const aggregateSchema = z.object({
  count: z.boolean().optional(),
  countBy: z.enum(GROUPABLE_FIELDS).optional(),
});

export const rawQueryPlanSchema = z.object({
  filter: z.unknown().optional(),
  rank: rankSchema.optional(),
  group: groupSchema.optional(),
  limit: z.number().optional(),
  aggregate: aggregateSchema.optional(),
});

// A plan as parsed from untrusted JSON: structurally valid but with `filter`
// still unknown and numbers unclamped. The renderer turns this into a QueryPlan.
export type RawQueryPlan = z.infer<typeof rawQueryPlanSchema>;

export function parseQueryPlan(raw: unknown): RawQueryPlan | null {
  const res = rawQueryPlanSchema.safeParse(raw);
  return res.success ? res.data : null;
}

// ---- Structured-output schemas (for the AI SDK `generateObject` path) ------
// `rawQueryPlanSchema` keeps `filter` as `unknown` so any text/JSON the model
// produces survives to the renderer's validateQuery gate. But `generateObject`
// turns the schema into a provider JSON schema the model must satisfy, so it
// needs concrete shapes. These mirror the prompt: a flat (one-level) boolean
// filter plus the same rank/group/limit/aggregate steps. Anything the model
// emits is STILL re-validated + clamped by validatePlan, so these are about
// guiding structured output, never trust.
const filterValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
  z.array(z.number()),
]);

const predicateSchema = z.object({
  field: z.string(),
  operator: z.string(),
  value: filterValueSchema.optional(),
  negate: z.boolean().optional(),
});

const filterSchema = z.object({
  combinator: z.enum(["and", "or"]),
  rules: z.array(predicateSchema),
});

// Concrete plan schema handed to `generateObject`. Object-rooted (so OpenAI's
// strict structured outputs accept it) and recursion-free (so Gemini's
// restricted response schema accepts it). Providers that still reject it fall
// back to free-text JSON + jsonrepair in the main process.
export const queryPlanSchema = z.object({
  filter: filterSchema,
  rank: rankSchema.optional(),
  group: groupSchema.optional(),
  limit: z.number().optional(),
  aggregate: aggregateSchema.optional(),
});

// ---- Agentic loop protocol ------------------------------------------------
// For capable providers, the agent reasons in steps, emitting ONE action per
// round (ReAct-style). The renderer executes the action's tool over the pool and
// feeds an observation back for the next round, until the model finishes with a
// `final` plan (grid result) or an `answer` (prose, e.g. counts/comparisons).

export const AGENT_ACTION_TYPES = [
  "inspect",
  "run_plan",
  "final",
  "answer",
] as const;
export type AgentActionType = (typeof AGENT_ACTION_TYPES)[number];

export type AgentAction =
  // Request a digest of the library (top facets + total) before deciding.
  | { type: "inspect" }
  // Execute a plan and observe match count + a small sample, then keep going.
  | { type: "run_plan"; plan: RawQueryPlan }
  // Finish: the result set this plan produces takes over the grid.
  | { type: "final"; plan: RawQueryPlan }
  // Finish: a short prose answer (no grid), for "how many / which is more".
  | { type: "answer"; text: string };

export const agentActionSchema: z.ZodType<AgentAction> = z.union([
  z.object({ type: z.literal("inspect") }),
  z.object({ type: z.literal("run_plan"), plan: rawQueryPlanSchema }),
  z.object({ type: z.literal("final"), plan: rawQueryPlanSchema }),
  z.object({ type: z.literal("answer"), text: z.string() }),
]);

export function parseAgentAction(raw: unknown): AgentAction | null {
  const res = agentActionSchema.safeParse(raw);
  return res.success ? res.data : null;
}

// One completed step in the loop, sent back to the model so it can build on what
// it has already observed. The observation is the tool result rendered as text.
export interface AgentStepRecord {
  action: AgentAction;
  observation?: string;
}
