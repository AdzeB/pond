import {
  type CustomSkill,
  matchSkills,
  slugifySkillName,
} from "@/lib/save/skills";
import type { Save } from "@/lib/types";

// How many skills the "/" menu shows before a "Show N more" expander appears.
const GROUP_CAP = 5;
const LOOKUP_CAP = 8;

export type AskMenuItem =
  | { kind: "skill"; key: string; skill: CustomSkill }
  | { kind: "create"; key: string; name: string }
  | { kind: "more"; key: string; count: number }
  | { kind: "save"; key: string; save: Save }
  | { kind: "tag"; key: string; tag: string; count: number };

interface AskMenuGroup {
  id: string;
  label: string;
  items: AskMenuItem[];
}

export interface AskMenu {
  groups: AskMenuGroup[];
  flat: AskMenuItem[];
}

export function tagCountsOf(saves: ReadonlyArray<Save>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const save of saves) {
    if (save.deletedAt) continue;
    for (const tag of save.tags ?? []) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return counts;
}

function matchSaves(saves: ReadonlyArray<Save>, query: string): Save[] {
  const q = query.trim().toLowerCase();
  const live = saves.filter((s) => !s.deletedAt);
  if (!q) return live.slice(0, LOOKUP_CAP);
  return live
    .filter((s) =>
      [s.title, s.author, s.url].some((v) =>
        (v ?? "").toLowerCase().includes(q),
      ),
    )
    .slice(0, LOOKUP_CAP);
}

function matchTagList(
  counts: Map<string, number>,
  query: string,
): { tag: string; count: number }[] {
  const q = query.trim().toLowerCase();
  const all = Array.from(counts, ([tag, count]) => ({ tag, count }));
  const filtered = q ? all.filter((t) => t.tag.toLowerCase().includes(q)) : all;
  filtered.sort((a, b) => {
    if (q) {
      const ap = a.tag.toLowerCase().startsWith(q) ? 0 : 1;
      const bp = b.tag.toLowerCase().startsWith(q) ? 0 : 1;
      if (ap !== bp) return ap - bp;
    }
    return b.count - a.count || a.tag.localeCompare(b.tag);
  });
  return filtered.slice(0, LOOKUP_CAP);
}

export function buildSkillMenu(
  skills: ReadonlyArray<CustomSkill>,
  query: string,
  expanded: boolean,
): AskMenu {
  const matched = matchSkills(skills, query);
  const visible = expanded ? matched : matched.slice(0, GROUP_CAP);
  const items: AskMenuItem[] = visible.map((skill) => ({
    kind: "skill",
    key: `skill-${skill.id}`,
    skill,
  }));
  if (!expanded && matched.length > GROUP_CAP) {
    items.push({
      kind: "more",
      key: "more",
      count: matched.length - GROUP_CAP,
    });
  }
  items.push({ kind: "create", key: "create", name: slugifySkillName(query) });
  return { groups: [{ id: "skills", label: "Skills", items }], flat: items };
}

export function buildSaveMenu(
  saves: ReadonlyArray<Save>,
  query: string,
): AskMenu | null {
  const items: AskMenuItem[] = matchSaves(saves, query).map((save) => ({
    kind: "save",
    key: `save-${save.id}`,
    save,
  }));
  if (items.length === 0) return null;
  return { groups: [{ id: "saves", label: "Saves", items }], flat: items };
}

export function buildTagMenu(
  tagCounts: Map<string, number>,
  query: string,
): AskMenu | null {
  const items: AskMenuItem[] = matchTagList(tagCounts, query).map((t) => ({
    kind: "tag",
    key: `tag-${t.tag}`,
    tag: t.tag,
    count: t.count,
  }));
  if (items.length === 0) return null;
  return { groups: [{ id: "tags", label: "Tags", items }], flat: items };
}
