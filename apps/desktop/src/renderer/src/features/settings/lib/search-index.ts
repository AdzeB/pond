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

export const SETTINGS_SEARCH_INDEX: SettingsSearchEntry[] = SECTIONS.filter(
  (section) => !section.hidden,
).flatMap(sectionEntries);

for (const [key, title, description] of [
  ["location", "Library Location", "Reveal your library in Finder"],
  ["move", "Move Library", "Copy your library and switch to a new location"],
  ["backup", "Back Up Library", "Create a backup"],
  ["open", "Open Library", "Open a library or restore a backup"],
  ["import", "Import Eagle Library", "Import files, folders and tags"],
  [
    "watched-folder",
    "Watched Folder",
    "Automatically import files from a folder",
  ],
]) {
  SETTINGS_SEARCH_INDEX.push({
    id: `storage:${key}`,
    sectionId: "storage",
    sectionLabel: "Storage & Backups",
    path: "storage",
    itemKey: key,
    title: title ?? "",
    description,
    keywords: [],
  });
}
SETTINGS_SEARCH_INDEX.push({
  id: "models:mcp",
  sectionId: "models",
  sectionLabel: "Integrations",
  path: "models",
  itemKey: "mcp",
  title: "Connect Cursor",
  description: "MCP configuration for external apps",
  keywords: ["stdio", "mcp"],
});
