import { COLOR_PRESETS } from "@pond/schema/filters/color";
import { FIELD_META } from "@pond/schema/filters/meta";
import type { FieldId, FieldTypeId } from "@pond/schema/filters/types";
import { useMemo } from "react";
import { FIELD_HINTS, FIELD_ICONS, type FieldIcon } from "@/lib/search-fields";
import {
  canonicalKey,
  DATE_PRESETS,
  matchFieldToken,
  type RawToken,
  TOKEN_FIELDS,
  tokenize,
} from "@/lib/search-syntax";
import type { Save } from "@/lib/types";
import { useSaves } from "./use-saves";

type IconType = FieldIcon;

export interface SuggestionItem {
  id: string;
  label: string;
  hint?: string;
  icon?: IconType;
  swatch?: string;
  // Replacement text for the active token's [start, end) range.
  insert: string;
  // Keep the dropdown open after applying (picking a field reveals its values).
  keepOpen?: boolean;
  // What applying the item does. "insert" (default) splices `insert` into the
  // active token; "dialog" opens the in-depth filter dialog; "history" replays
  // a stored search (`insert` holds the full query string).
  action?: "insert" | "dialog" | "history";
  // For "history" items, the id of the stored entry (so it can be removed).
  historyId?: string;
}

export interface SuggestionGroup {
  id: string;
  label?: string;
  items: SuggestionItem[];
}

export interface SuggestionState {
  token: RawToken;
  groups: SuggestionGroup[];
  // The active field has candidates but none match what's been typed yet. The
  // dropdown stays open to show a "No matches" hint instead of collapsing.
  empty: boolean;
}

interface LiveValue {
  value: string;
  count: number;
}

interface LiveValues {
  tags: LiveValue[];
  sources: LiveValue[];
  types: LiveValue[];
  creators: LiveValue[];
}

const MAX_ITEMS = 8;

function bump(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function sortByCount(map: Map<string, number>): LiveValue[] {
  return Array.from(map, ([value, count]) => ({ value, count })).sort(
    (a, b) => b.count - a.count || a.value.localeCompare(b.value),
  );
}

function computeLiveValues(saves: ReadonlyArray<Save>): LiveValues {
  const tags = new Map<string, number>();
  const sources = new Map<string, number>();
  const types = new Map<string, number>();
  const creators = new Map<string, number>();
  for (const save of saves) {
    if (save.deletedAt) continue;
    for (const tag of save.tags ?? []) bump(tags, tag.toLowerCase());
    if (save.source) bump(sources, save.source.toLowerCase());
    // Only true media types belong here; falling back to `source` would
    // duplicate the dedicated `source:` field's values into `type:`.
    const type = (save.mediaType ?? "").toLowerCase();
    if (type) bump(types, type);
    const author = save.author?.trim();
    if (author) bump(creators, author);
  }
  return {
    tags: sortByCount(tags),
    sources: sortByCount(sources),
    types: sortByCount(types),
    creators: sortByCount(creators),
  };
}

interface ValueCandidate {
  value: string;
  label: string;
  hint?: string;
  swatch?: string;
}

function presetCandidates(field: FieldId): ValueCandidate[] {
  const presets = FIELD_META[field].presets ?? [];
  return presets.map((p) => ({
    value: String(p.value).toLowerCase(),
    label: p.label,
  }));
}

// Merge curated presets with distinct live values (live ones the presets don't
// already cover), keeping preset labels and surfacing counts as hints.
function mergeLive(
  base: ValueCandidate[],
  live: LiveValue[],
): ValueCandidate[] {
  const seen = new Set(base.map((c) => c.value));
  const extra = live
    .filter((l) => !seen.has(l.value))
    .map((l) => ({ value: l.value, label: l.value, hint: String(l.count) }));
  return [...base, ...extra];
}

function valueCandidates(
  field: FieldId,
  type: FieldTypeId,
  live: LiveValues,
): ValueCandidate[] {
  switch (field) {
    case "source":
      return mergeLive(presetCandidates(field), live.sources);
    case "type":
      return mergeLive(presetCandidates(field), live.types);
    case "creator":
      return live.creators.map((c) => ({
        value: c.value,
        label: c.value,
        hint: String(c.count),
      }));
    case "tags":
      return live.tags.map((t) => ({
        value: t.value,
        label: t.value,
        hint: String(t.count),
      }));
    case "color":
      return COLOR_PRESETS.map((c) => ({
        value: c.label.toLowerCase(),
        label: c.label,
        swatch: c.hex,
      }));
    case "note":
      return [
        { value: "with", label: "With a note" },
        { value: "without", label: "Without a note" },
      ];
    default:
      break;
  }

  if (type === "date") {
    return DATE_PRESETS.map((d) => ({ value: d.slug, label: d.label }));
  }
  if (type === "enum") {
    return presetCandidates(field);
  }
  return [];
}

function quote(value: string): string {
  return /\s/.test(value) ? `"${value}"` : value;
}

// The whitespace-delimited token the caret is sitting in (or an empty token at
// the caret when it's in surrounding whitespace).
function activeToken(input: string, caret: number): RawToken {
  for (const token of tokenize(input)) {
    if (caret >= token.start && caret <= token.end) return token;
  }
  return { text: "", start: caret, end: caret };
}

function fieldSuggestions(token: RawToken): SuggestionGroup[] {
  const negate = token.text.startsWith("-");
  const word = token.text.replace(/^-/, "").toLowerCase();
  const matched: { spec: (typeof TOKEN_FIELDS)[number]; rank: number }[] = [];
  for (const spec of TOKEN_FIELDS) {
    const label = FIELD_META[spec.field].label.toLowerCase();
    const keyPrefix = spec.keys.some((k) => k.startsWith(word));
    const labelPrefix = label.startsWith(word);
    const matches =
      word === "" || keyPrefix || label.includes(word) || labelPrefix;
    if (!matches) continue;
    // Surface prefix matches (on a key or the label) ahead of mid-string ones.
    matched.push({
      spec,
      rank: word === "" || keyPrefix || labelPrefix ? 0 : 1,
    });
  }
  // Stable sort: ties keep the curated TOKEN_FIELDS order.
  matched.sort((a, b) => a.rank - b.rank);
  const items: SuggestionItem[] = matched.map(({ spec }) => ({
    id: spec.field,
    label: FIELD_META[spec.field].label,
    hint: FIELD_HINTS[spec.field],
    icon: FIELD_ICONS[spec.field],
    insert: `${negate ? "-" : ""}${canonicalKey(spec.field)}:`,
    keepOpen: true,
  }));
  return items.length ? [{ id: "fields", label: "Filter by", items }] : [];
}

interface ValueResult {
  groups: SuggestionGroup[];
  // True when the field offers values but the current input matches none of
  // them, so the caller can surface a "No matches" hint.
  empty: boolean;
}

function valueSuggestions(
  token: RawToken,
  field: FieldId,
  rawValue: string,
  live: LiveValues,
): ValueResult {
  const type = FIELD_META[field].type;
  const candidates = valueCandidates(field, type, live);
  if (candidates.length === 0) return { groups: [], empty: false };

  // For comma lists, only the segment after the last comma is being edited.
  // `rawPartial` is the exact substring (for splicing); `needle` is normalized
  // (for matching) — they can differ in length, so keep them separate.
  const lastComma = rawValue.lastIndexOf(",");
  const rawPartial = lastComma >= 0 ? rawValue.slice(lastComma + 1) : rawValue;
  const needle = rawPartial.trim().toLowerCase().replace(/^"|"$/g, "");
  const beforePartial = token.text.slice(
    0,
    token.text.length - rawPartial.length,
  );

  const matches = candidates.filter(
    (c) =>
      needle === "" ||
      c.value.includes(needle) ||
      c.label.toLowerCase().includes(needle),
  );

  // Rank prefix matches (value or label) ahead of mid-string hits; ties keep
  // their incoming order (counts/presets). Stable sort preserves that.
  if (needle !== "") {
    matches.sort((a, b) => prefixRank(a, needle) - prefixRank(b, needle));
  }

  const items: SuggestionItem[] = matches.slice(0, MAX_ITEMS).map((c) => ({
    id: `${field}:${c.value}`,
    label: c.label,
    hint: c.hint,
    icon: FIELD_ICONS[field],
    swatch: c.swatch,
    insert: `${beforePartial}${quote(c.value)} `,
  }));

  if (items.length === 0) return { groups: [], empty: true };
  return {
    groups: [{ id: "values", label: FIELD_META[field].label, items }],
    empty: false,
  };
}

function prefixRank(candidate: ValueCandidate, needle: string): number {
  const value = candidate.value.toLowerCase();
  const label = candidate.label.toLowerCase();
  return value.startsWith(needle) || label.startsWith(needle) ? 0 : 1;
}

export function useSearchSuggestions(
  input: string,
  caret: number,
): SuggestionState {
  const saves = useSaves();
  const live = useMemo(() => computeLiveValues(saves), [saves]);

  return useMemo(() => {
    const token = activeToken(input, caret);
    const matched = matchFieldToken(token.text);
    if (matched) {
      const { groups, empty } = valueSuggestions(
        token,
        matched.field,
        matched.rawValue,
        live,
      );
      return { token, groups, empty };
    }
    return { token, groups: fieldSuggestions(token), empty: false };
  }, [input, caret, live]);
}
