/**
 * Query-plan IR the Ask agent compiles to: filter -> rank -> group -> limit -> aggregate, run by a deterministic renderer executor.
 * Intentionally not a general program: only these typed steps exist, so a model can never make the app execute arbitrary logic.
 */

import { z } from "zod";
import type { Query } from "./filters/types";

/** Enum/string fields group by their value; `tags` puts a save in one group per tag; date fields group by a calendar bucket. */
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

/** "relevance", the other RankSpec arm, uses the semantic/keyword ranker instead of these fields. */
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

/** How the filtered set is ordered before grouping/limiting. */
export type RankSpec =
  | { kind: "relevance" }
  | { kind: "field"; field: SortableField; dir: "asc" | "desc" };

export interface GroupSpec {
  by: GroupableField;
  /** Calendar granularity; only meaningful when `by` is a date field. */
  bucket?: DateBucket;
  /** Keep at most this many items per group. */
  perGroup?: number;
  /** Round-robin across groups instead of concatenating whole group blocks. */
  interleave?: boolean;
  /** Keep at most this many groups, the largest or earliest-appearing ones. */
  maxGroups?: number;
}

export interface AggregateSpec {
  /** Emit the total match count as a fact. */
  count?: boolean;
  /** Emit per-group counts as facts. */
  countBy?: GroupableField;
}

export interface QueryPlan {
  filter: Query;
  rank?: RankSpec;
  group?: GroupSpec;
  limit?: number;
  aggregate?: AggregateSpec;
}

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

/**
 * Lenient parse of untrusted model output: `filter` passes through as unknown and is re-validated by the
 * renderer's validateQuery; validatePlan then clamps numeric bounds. Unknown extra keys are stripped.
 */
export const rawQueryPlanSchema = z.object({
  filter: z.unknown().optional(),
  rank: rankSchema.optional(),
  group: groupSchema.optional(),
  limit: z.number().optional(),
  aggregate: aggregateSchema.optional(),
});

/** Structurally valid but with `filter` still unknown and numbers unclamped; the renderer turns this into a QueryPlan. */
export type RawQueryPlan = z.infer<typeof rawQueryPlanSchema>;

export function parseQueryPlan(raw: unknown): RawQueryPlan | null {
  const res = rawQueryPlanSchema.safeParse(raw);
  return res.success ? res.data : null;
}

/**
 * `generateObject` compiles the schema into a provider JSON schema the model must satisfy, so these need concrete shapes.
 * Anything the model emits is still re-validated and clamped by validatePlan; these guide structured output, never trust.
 */
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

/**
 * Object-rooted so OpenAI's strict structured outputs accept it; recursion-free so Gemini's restricted response
 * schema accepts it. Providers that still reject it fall back to free-text JSON + jsonrepair in the main process.
 */
export const queryPlanSchema = z.object({
  filter: filterSchema,
  rank: rankSchema.optional(),
  group: groupSchema.optional(),
  limit: z.number().optional(),
  aggregate: aggregateSchema.optional(),
});

/**
 * Agentic loop protocol: the model emits one action per round; the renderer executes it over the pool and
 * feeds an observation back, until the model finishes with a `final` plan (grid result) or an `answer` (prose).
 */
export const AGENT_ACTION_TYPES = [
  "inspect",
  "run_plan",
  "final",
  "answer",
] as const;
export type AgentActionType = (typeof AGENT_ACTION_TYPES)[number];

export type AgentAction =
  /** Request a digest of the library before deciding. */
  | { type: "inspect" }
  /** Execute a plan and observe match count plus a small sample, then keep going. */
  | { type: "run_plan"; plan: RawQueryPlan }
  /** Finish: the result set this plan produces takes over the grid. */
  | { type: "final"; plan: RawQueryPlan }
  /** Finish: a short prose answer with no grid. */
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

/** One completed loop step sent back to the model; the observation is the tool result rendered as text. */
export interface AgentStepRecord {
  action: AgentAction;
  observation?: string;
}
