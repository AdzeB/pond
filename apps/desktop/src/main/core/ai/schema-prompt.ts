import { FIELD_IDS, FIELD_META } from "@pond/schema/filters/meta";
import { COMPARATORS_BY_TYPE } from "@pond/schema/filters/types";
import type { CompileContext } from "./types";

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
- For media kind use field "type" with values image | video | link. Link/URL/article/website saves are type "link" (not "url").
- For origin use field "source" with a site hostname (e.g. dribbble.com, instagram.com) or "local" for imported files. Do not use platform buckets like "web" or "twitter".
- For orientation use field "shape" with values square | landscape | portrait | panoramic-landscape | panoramic-portrait.
- For common ratios use field "aspect" with values 1:1 | 4:3 | 3:4 | 16:9 | 9:16.
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
