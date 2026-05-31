import type { AutoTagRule, Save } from "@pond/schema/db";
import { getPrefs } from "./prefs";
import { setSaveTags } from "./tags";

type AutoTagFields = Pick<Save, "source" | "url" | "author" | "title">;

// Pure rule matcher. A rule matches only if at least one condition is set and
// every set condition matches. Returns the union of addTags from all matching
// rules (lowercased, deduped).
export function evaluateAutoTags(
  save: AutoTagFields,
  rules: ReadonlyArray<AutoTagRule>,
): string[] {
  const out = new Set<string>();
  for (const rule of rules) {
    if (!rule.enabled) continue;
    if (!ruleMatches(save, rule)) continue;
    for (const t of rule.addTags) {
      const norm = t.replace(/^#+/, "").trim().toLowerCase();
      if (norm) out.add(norm);
    }
  }
  return Array.from(out);
}

function ruleMatches(save: AutoTagFields, rule: AutoTagRule): boolean {
  let hasCondition = false;
  if (rule.source) {
    hasCondition = true;
    if (save.source !== rule.source) return false;
  }
  if (rule.urlContains) {
    hasCondition = true;
    if (!includesFold(save.url, rule.urlContains)) return false;
  }
  if (rule.authorContains) {
    hasCondition = true;
    if (!includesFold(save.author, rule.authorContains)) return false;
  }
  if (rule.titleContains) {
    hasCondition = true;
    if (!includesFold(save.title, rule.titleContains)) return false;
  }
  return hasCondition;
}

function includesFold(
  value: string | null | undefined,
  needle: string,
): boolean {
  return (value ?? "").toLowerCase().includes(needle.toLowerCase());
}

// Side-effecting: reads prefs, computes tags, merges with the save's existing
// tags, and persists via setSaveTags (which also auto-creates tag rows).
export async function applyAutoTags(save: Save): Promise<void> {
  const prefs = await getPrefs();
  if (!prefs.autoTag?.enabled) return;
  const add = evaluateAutoTags(save, prefs.autoTag.rules ?? []);
  if (add.length === 0) return;
  const existing = new Set((save.tags ?? []).map((t) => t.toLowerCase()));
  const merged = [...(save.tags ?? [])];
  for (const t of add) if (!existing.has(t)) merged.push(t);
  if (merged.length === (save.tags ?? []).length) return;
  await setSaveTags(save.id, merged);
}
