import { ulid } from "ulid";

export type { CustomSkill } from "@pond/schema/db";

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
