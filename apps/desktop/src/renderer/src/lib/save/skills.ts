import type { CustomSkill } from "@pond/schema/db";
import { ulid } from "ulid";
import { fuzzyRank } from "@/lib/util/fuzzy";

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
  return `skill_${ulid()}`;
}

// Fuzzy-rank custom skills by name + description. Empty query returns all
// skills in their stored order.
export function matchSkills(
  skills: readonly CustomSkill[],
  query: string,
): CustomSkill[] {
  return fuzzyRank(skills, query, (s) => `${s.name} ${s.description}`);
}
