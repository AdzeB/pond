import type { ReactNode } from "react";
import { z } from "zod";
import type { GroupConfig, Item } from "@/features/settings/lib/engine-types";
import { SECTIONS, type SectionDef } from "@/features/settings/lib/registry";

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

const TextNodeSchema = z.string().optional().catch(undefined);

function asText(node: ReactNode): string | undefined {
  return TextNodeSchema.parse(node);
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

export const SETTINGS_SEARCH_INDEX: SettingsSearchEntry[] =
  SECTIONS.flatMap(sectionEntries);
