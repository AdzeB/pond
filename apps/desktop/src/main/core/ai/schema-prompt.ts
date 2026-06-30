import {
  type AgentStepRecord,
  DATE_BUCKETS,
  GROUPABLE_FIELDS,
  SORTABLE_FIELDS,
} from "@pond/schema";
import { FIELD_IDS, FIELD_META } from "@pond/schema/filters/meta";
import { COMPARATORS_BY_TYPE } from "@pond/schema/filters/types";
import type { CompileContext, SummaryItem } from "./types";

// Builds the grounding prompt + JSON schema for the LLM query compiler. The
// model is told the exact fields, their allowed operators, and the user's real
// facet values, then constrained to emit a Query object. Whatever it returns is
// still re-validated by Stage D, so the schema/prompt are about quality, not safety.

function fieldLines(): string {
  return FIELD_IDS.map((id) => {
    const meta = FIELD_META[id];
    const ops = COMPARATORS_BY_TYPE[meta.type].join(", ");
    return `- ${id} (${meta.type}; operators: ${ops})`;
  }).join("\n");
}

const RULES = `
You translate a user's natural-language request into a JSON query that filters their saved items.

Output ONLY a JSON object of this shape (no prose, no markdown):
{
  "combinator": "and" | "or",
  "rules": [
    { "field": <field>, "operator": <operator>, "value": <value>, "negate": <optional boolean> }
  ]
}

Guidelines:
- Use only the fields and operators listed below.
- Prefer real values from the provided lists. If the user clearly means a value not in a list, you may still use it.
- For "X or Y" on the same field, use operator "in" with an array value.
- For relative dates use an ISO-8601 duration string with a leading minus, e.g. "-P1W" (past week), "-P1M" (past month), "-P1Y" (past year), "-P1D" (today). Use operator "gte" for "since/within".
- Pick the right date field: "saved/added" -> savedAt, "published/posted" -> publishedAt, "modified/updated/edited" -> modifiedAt. Default to savedAt when unspecified.
- For media length use field "duration" (a number of SECONDS), e.g. "longer than 5 minutes" -> duration gt 300, "under 2 minutes" -> duration lt 120, "short videos" -> duration lte 60. Pair with type "video" when the user says videos/clips.
- For tags use operator "some" with an array. For "untagged" use field "tags", operator "empty".
- For the number of attached files/images/photos use field "fileCount" (number), e.g. "more than one image" -> fileCount gt 1, "multiple images" -> fileCount gt 1, "at least 3 photos" -> fileCount gte 3. Pair it with a "type" filter when the user names a media kind.
- For "has a note" use field "note", operator "exists", value true; for "no note" value false.
- Omit anything you are unsure about rather than guessing a field.
- If nothing matches, return {"combinator":"and","rules":[]}.
`.trim();

export function buildSystemPrompt(ctx: CompileContext): string {
  const f = ctx.facets;
  const list = (label: string, values: string[]) =>
    values.length > 0 ? `${label}: ${values.join(", ")}` : `${label}: (none)`;

  return [
    RULES,
    "",
    "Fields:",
    fieldLines(),
    "",
    "Known values in this library:",
    list("sources", f.sources),
    list("types", f.types),
    list("tags", f.tags.slice(0, 80)),
    list("creators", f.creators.slice(0, 60)),
  ].join("\n");
}

// ---- Query-plan prompt (the richer agent output) --------------------------
// Capable providers compile to a plan: a small pipeline of filter -> rank ->
// group (+ per-group sample) -> limit -> aggregate. This lets the agent express
// "a few from each source", "group by month", "how many X vs Y", etc., which the
// flat filter alone cannot. Whatever it returns is still validated + clamped.

const PLAN_RULES = `
You translate a user's natural-language request into a JSON "query plan" that runs over their saved items.

Output ONLY a JSON object of this shape (no prose, no markdown):
{
  "filter": { "combinator": "and" | "or", "rules": [ { "field": <field>, "operator": <operator>, "value": <value>, "negate"?: boolean } ] },
  "rank":   { "kind": "relevance" } | { "kind": "field", "field": <sortField>, "dir": "asc" | "desc" },
  "group":  { "by": <groupField>, "bucket"?: <dateBucket>, "perGroup"?: number, "interleave"?: boolean, "maxGroups"?: number },
  "limit":  number,
  "aggregate": { "count"?: boolean, "countBy"?: <groupField> }
}

Only "filter" is required; omit any part you don't need.

Guidelines:
- filter: the same boolean filter as before. Use only the listed fields/operators. For "X or Y" on one field use operator "in" with an array. Relative dates are ISO-8601 durations with a leading minus ("-P1W", "-P1M", "-P1Y"); use "gte" for "since/within". saved/added -> savedAt, published/posted -> publishedAt, modified/updated -> modifiedAt. duration is SECONDS; tags use "some" with an array.
- rank: how to order results. Use { "kind": "field", ... } for explicit "newest/oldest/longest/most files"; otherwise prefer { "kind": "relevance" } (semantic/keyword).
- group: cluster results by a field. For "a few from each source" use { "by": "source", "perGroup": 3, "interleave": true }. For date fields set "bucket" (day/week/month/year), e.g. "by month" -> { "by": "savedAt", "bucket": "month" }. "maxGroups" caps how many groups.
- limit: a global cap, for "top 10" / "first 5".
- aggregate: for "how many" questions. "count": true returns the total; "countBy" returns per-group counts (e.g. "how many by source" -> { "countBy": "source" }). Still include a "filter".
- Omit anything you're unsure about. If nothing matches, return { "filter": { "combinator": "and", "rules": [] } }.
`.trim();

function planFieldLines(): string {
  return [
    `Sort fields (for rank.field): ${SORTABLE_FIELDS.join(", ")}`,
    `Group fields (for group.by / aggregate.countBy): ${GROUPABLE_FIELDS.join(", ")}`,
    `Date buckets (for group.bucket): ${DATE_BUCKETS.join(", ")}`,
  ].join("\n");
}

export function buildPlanPrompt(ctx: CompileContext): string {
  const f = ctx.facets;
  const list = (label: string, values: string[]) =>
    values.length > 0 ? `${label}: ${values.join(", ")}` : `${label}: (none)`;

  return [
    PLAN_RULES,
    "",
    "Filter fields:",
    fieldLines(),
    "",
    planFieldLines(),
    "",
    "Known values in this library:",
    list("sources", f.sources),
    list("types", f.types),
    list("tags", f.tags.slice(0, 80)),
    list("creators", f.creators.slice(0, 60)),
  ].join("\n");
}

// ---- Agentic loop prompt --------------------------------------------------
// The agent reasons in steps, emitting ONE action per round; the renderer runs
// the action over the library and feeds an observation back. See AgentAction.

const AGENT_RULES = `
You are a search agent over the user's saved items (bookmarks, images, videos, articles, posts). Answer the request by reasoning in steps, emitting exactly ONE action per step as a JSON object (no prose, no markdown).

Actions:
- { "type": "inspect" } — get a digest of the library (top sources/types/tags/creators and totals) before deciding.
- { "type": "run_plan", "plan": <QueryPlan> } — execute a plan; you'll see how many items match and a small sample, so you can refine.
- { "type": "final", "plan": <QueryPlan> } — finish: the result set this plan produces is shown to the user as a grid.
- { "type": "answer", "text": <string> } — finish with a short prose answer (for "how many" / "which is more" questions where a grid isn't needed).

A QueryPlan object:
{
  "filter": { "combinator": "and" | "or", "rules": [ { "field": <field>, "operator": <operator>, "value": <value> } ] },
  "rank":   { "kind": "relevance" } | { "kind": "field", "field": <sortField>, "dir": "asc" | "desc" },
  "group":  { "by": <groupField>, "bucket"?: <dateBucket>, "perGroup"?: number, "interleave"?: boolean, "maxGroups"?: number },
  "limit":  number,
  "aggregate": { "count"?: boolean, "countBy"?: <groupField> }
}
Only "filter" is required.

Rules:
- Finish quickly — use as few steps as possible.
- Use "final" for "show me …" requests; use "answer" for "how many / which is more …" (run a plan with "aggregate" first, then cite its facts).
- Base every number you state on an observation you actually received; never invent counts.
- For "a few from each source": group by source with a small perGroup and interleave true.
- Use only the fields/operators/values listed below.
`.trim();

export function buildAgentPrompt(ctx: CompileContext): string {
  const f = ctx.facets;
  const list = (label: string, values: string[]) =>
    values.length > 0 ? `${label}: ${values.join(", ")}` : `${label}: (none)`;

  return [
    AGENT_RULES,
    "",
    "Filter fields:",
    fieldLines(),
    "",
    planFieldLines(),
    "",
    "Known values in this library:",
    list("sources", f.sources),
    list("types", f.types),
    list("tags", f.tags.slice(0, 80)),
    list("creators", f.creators.slice(0, 60)),
  ].join("\n");
}

// Render the question + the steps taken so far into the user message for the
// next agent round. Keeps observations the model can build on.
export function formatAgentHistory(
  question: string,
  steps: ReadonlyArray<AgentStepRecord>,
): string {
  const lines: string[] = [`Request: ${question}`, ""];
  if (steps.length === 0) {
    lines.push("No steps yet. Output your first action as JSON.");
    return lines.join("\n");
  }
  steps.forEach((step, i) => {
    lines.push(`Step ${i + 1} action: ${JSON.stringify(step.action)}`);
    if (step.observation) lines.push(`Observation: ${step.observation}`);
  });
  lines.push("");
  lines.push("Output your next action as JSON.");
  return lines.join("\n");
}

// System prompt for the result summarizer. The model only ever sees the items
// we hand it, so it can't invent results; we ask for one or two plain sentences.
export function buildSummaryPrompt(): string {
  return [
    "You help a user understand the results of a search over their saved items",
    "(bookmarks, videos, images, articles, posts).",
    "",
    "Given the user's question and the list of matching items, write a brief,",
    "friendly summary of what was found in ONE or TWO sentences.",
    "",
    "Guidelines:",
    '- Lead with the count naturally, e.g. "Found 12 saves about…".',
    "- Call out common themes, sources, or creators when they're clear.",
    "- Only describe items that appear in the list; never invent details.",
    "- Output plain prose only. No markdown, no bullet lists, no preamble.",
  ].join("\n");
}

// Render the question + matched items into the user message for the summarizer.
export function formatSummaryItems(
  question: string,
  items: SummaryItem[],
): string {
  const lines = items.map((it, i) => {
    const parts = [it.title?.trim() || "Untitled"];
    if (it.author) parts.push(`by ${it.author}`);
    if (it.source) parts.push(`(${it.source})`);
    const tags = (it.tags ?? []).slice(0, 4);
    if (tags.length > 0) parts.push(tags.map((t) => `#${t}`).join(" "));
    return `${i + 1}. ${parts.join(" ")}`;
  });
  return [
    `Question: ${question || "(no question — similar items)"}`,
    "",
    `Results (${items.length}):`,
    lines.join("\n"),
  ].join("\n");
}

// JSON schema describing the Query object, for providers that support
// structured output (Ollama `format`, OpenAI-compatible `json_schema`).
export function queryJsonSchema(): Record<string, unknown> {
  return {
    type: "object",
    properties: {
      combinator: { type: "string", enum: ["and", "or"] },
      rules: {
        type: "array",
        items: {
          type: "object",
          properties: {
            field: { type: "string", enum: [...FIELD_IDS] },
            operator: { type: "string" },
            value: {},
            negate: { type: "boolean" },
          },
          required: ["field", "operator", "value"],
        },
      },
    },
    required: ["combinator", "rules"],
  };
}
