import type { MenuTextMatch } from "@lexical/react/LexicalTypeaheadMenuPlugin";
import { FIELD_META } from "@pond/schema/filters/meta";
import type { FieldId } from "@pond/schema/filters/types";
import {
  canonicalKey,
  DATE_PRESETS,
  fieldForKey,
} from "@/features/search/lib/syntax";

const LOOKUP_CAP = 8;

interface ValueSuggestion {
  value: string;
  label: string;
}

export interface TypeaheadFacets {
  tags: ReadonlyArray<string>;
  sources: ReadonlyArray<string>;
  creators: ReadonlyArray<string>;
  accounts: ReadonlyArray<ValueSuggestion>;
  folders?: ReadonlyArray<ValueSuggestion>;
}

function valueSuggestionsFor(
  field: FieldId,
  facets: TypeaheadFacets,
): readonly ValueSuggestion[] {
  if (field === "tags")
    return facets.tags.map((value) => ({ value, label: value }));
  if (field === "creator")
    return facets.creators.map((value) => ({ value, label: value }));
  if (field === "folder") return facets.folders ?? [];
  if (field === "source") {
    const values = facets.sources.includes("local")
      ? facets.sources
      : [...facets.sources, "local"];
    return values.map((value) => ({
      value,
      label: value === "local" ? "Local" : value,
    }));
  }
  if (field === "account") return facets.accounts;
  const meta = FIELD_META[field];
  if (meta.presets)
    return meta.presets.map((p) => ({
      value: String(p.value),
      label: p.label,
    }));
  if (meta.type === "date")
    return DATE_PRESETS.map((d) => ({ value: d.slug, label: d.label }));
  return [];
}

export type MenuItem = {
  kind: "value";
  key: string;
  field: FieldId;
  label: string;
  description: string;
  token: string;
};

function matchRank(query: string, ...values: string[]): number {
  const normalized = values.map((value) => value.toLowerCase());
  if (!query || normalized.includes(query)) return 0;
  if (normalized.some((value) => value.startsWith(query))) return 1;
  if (normalized.some((value) => value.includes(query))) return 2;
  return 3;
}

function quoteIfNeeded(value: string): string {
  return /\s/.test(value) ? `"${value}"` : value;
}

function listParts(raw: string): string[] {
  return raw.match(/(?:[^,"\s]|"[^"]*"?)+|(?<=,)$/g) ?? [""];
}

export function buildMenu(
  raw: string,
  facets: TypeaheadFacets,
): { title: string; items: MenuItem[] } | null {
  const negate = raw.startsWith("-");
  const body = negate ? raw.slice(1) : raw;
  const prefix = negate ? "-" : "";
  const opMatch = /^([A-Za-z][\w]*)(:|>=|<=|>|<)(.*)$/.exec(body);
  if (opMatch) {
    const field = fieldForKey(opMatch[1] ?? "");
    if (!field) return null;
    const operator = opMatch[2] ?? ":";
    const parts = listParts(opMatch[3] ?? "");
    const q = (parts.pop() ?? "").replace(/^"|"$/g, "").toLowerCase();
    const selected = new Set(
      parts.map((part) => part.replace(/^"|"$/g, "").toLowerCase()),
    );
    const key = canonicalKey(field);
    const items = valueSuggestionsFor(field, facets)
      .filter(
        (s) =>
          !selected.has(s.value.toLowerCase()) &&
          matchRank(q, s.value, s.label) < 3,
      )
      .sort(
        (a, b) =>
          matchRank(q, a.value, a.label) - matchRank(q, b.value, b.label),
      )
      .slice(0, LOOKUP_CAP)
      .map(
        (s): MenuItem => ({
          kind: "value",
          key: `${field}-${s.value}`,
          field,
          label: s.label,
          description: FIELD_META[field].label,
          token: `${prefix}${key}${operator}${[...parts, quoteIfNeeded(s.value)].join(",")}`,
        }),
      );
    return items.length ? { title: FIELD_META[field].label, items } : null;
  }

  return null;
}

export function triggerFn(text: string): MenuTextMatch | null {
  const match = /(?:^|\s)(-?[A-Za-z](?:[^\s"]|"[^"]*"?)*)$/.exec(text);
  if (!match) return null;
  const token = match[1] ?? "";
  return {
    leadOffset: match.index + match[0].length - token.length,
    matchingString: token,
    replaceableString: token,
  };
}
