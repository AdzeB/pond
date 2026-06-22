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
