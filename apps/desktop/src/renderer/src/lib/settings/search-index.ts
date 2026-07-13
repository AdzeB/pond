import type { ReactNode } from "react";
import type { GroupConfig, Item } from "@/lib/settings/engine-types";
import { SECTIONS, type SectionDef } from "@/lib/settings/registry";

/** Either a whole section or a field within one; `itemKey` drives the scroll anchor (`setting-<sectionId>-<itemKey>`). */
export interface SettingsSearchEntry {
  id: string;
  sectionId: string;
  sectionLabel: string;
  path: string;
  groupTitle?: string;
  itemKey?: string;
  title: string;
  description?: string;
  keywords: string[];
}

/** Only plain-string nodes carry indexable text; richer titles/descriptions skip. */
function asText(node: ReactNode): string | undefined {
  return typeof node === "string" ? node : undefined;
}

function itemTitle(item: Item): string | undefined {
  if (item.control === "custom") return asText(item.title);
  return item.title;
}

function itemEntries(
  section: SectionDef,
  group: GroupConfig,
): SettingsSearchEntry[] {
  const groupTitle = asText(group.title);
  const entries: SettingsSearchEntry[] = [];
  for (const item of group.items ?? []) {
    const title = itemTitle(item);
    if (!title) continue;
    const description =
      "description" in item ? asText(item.description) : undefined;
    entries.push({
      id: `${section.id}:${item.key}`,
      sectionId: section.id,
      sectionLabel: section.label,
      path: section.path,
      groupTitle,
      itemKey: item.key,
      title,
      description,
      keywords: item.keywords ?? [],
    });
  }
  return entries;
}

function sectionEntries(section: SectionDef): SettingsSearchEntry[] {
  const { config } = section;
  const entries: SettingsSearchEntry[] = [];

  /** Section-level entry so the page name itself stays searchable. */
  entries.push({
    id: section.id,
    sectionId: section.id,
    sectionLabel: section.label,
    path: section.path,
    title: asText(config.title) ?? section.label,
    description: asText(config.description),
    keywords: config.keywords ?? [],
  });

  for (const group of config.groups ?? []) {
    entries.push(...itemEntries(section, group));
  }
  return entries;
}

/** Built once at module load. */
export const SETTINGS_SEARCH_INDEX: SettingsSearchEntry[] =
  SECTIONS.flatMap(sectionEntries);
