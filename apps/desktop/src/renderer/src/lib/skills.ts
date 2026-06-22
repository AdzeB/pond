import type { CustomSkill } from "@pond/schema/db";

export type { CustomSkill } from "@pond/schema/db";

// Normalize a free-typed name into a slash-token slug (no leading slash).
export function slugifySkillName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/^\/+/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function makeSkillId(): string {
  return `skill_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// Rank custom skills whose name/description contain the query, prefix matches
// first. Empty query returns all skills in their stored order.
export function matchSkills(
  skills: readonly CustomSkill[],
  query: string,
): CustomSkill[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...skills];
  const scored: { skill: CustomSkill; score: number }[] = [];
  for (const skill of skills) {
    const hay = [skill.name, skill.description].map((s) => s.toLowerCase());
    let best = Number.POSITIVE_INFINITY;
    for (const h of hay) {
      const idx = h.indexOf(q);
      if (idx === 0) best = Math.min(best, 0);
      else if (idx > 0) best = Math.min(best, 1);
    }
    if (best < Number.POSITIVE_INFINITY) scored.push({ skill, score: best });
  }
  scored.sort((a, b) => a.score - b.score);
  return scored.map((s) => s.skill);
}
