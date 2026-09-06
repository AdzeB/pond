import {
  IconColorPaletteOutline18 as Appearance,
  IconGear3Outline18 as General,
  IconImageOutline18 as Images,
  IconBracketsCurlyOutline18 as Mcp,
  IconNodes3Outline18 as Models,
  IconCalendarOutline18 as Schedule,
  IconMagnifierOutline18 as Search,
  IconServerOutline18 as Storage,
  IconLabelOutline18 as Tags,
  IconTrash2Outline18 as Trash,
  IconMovieOutline18 as Videos,
} from "@pond/icons/outline/18";
import type { IconComponent } from "@pond/icons/types";
import {
  SETTINGS_GROUP_LABELS,
  SETTINGS_GROUP_ORDER,
  SETTINGS_SECTIONS,
  type SettingsGroup,
  type SettingsSection,
} from "@pond/schema";
import type { SectionConfig } from "@/features/settings/components/engine/engine";
import { SECTION_CONFIGS } from "@/features/settings/lib/sections";

const ICONS = new Map<string, IconComponent>([
  ["general", General],
  ["schedule", Schedule],
  ["appearance", Appearance],
  ["tags", Tags],
  ["search", Search],
  ["models", Models],
  ["mcp", Mcp],
  ["trash", Trash],
  ["storage", Storage],
  ["videos", Videos],
  ["images", Images],
]);

export interface SectionDef extends SettingsSection {
  icon: IconComponent;
  config: SectionConfig;
}

export const SECTIONS: SectionDef[] = SETTINGS_SECTIONS.map((section) => {
  const icon = ICONS.get(section.id);
  const config = SECTION_CONFIGS.get(section.id);
  if (!icon || !config) {
    throw new Error(`settings registry missing renderer for "${section.id}"`);
  }
  return { ...section, icon, config };
});

const BESPOKE_SECTION_IDS = new Set(["tags", "models", "mcp"]);

export function isBespokeSection(section: SectionDef): boolean {
  return BESPOKE_SECTION_IDS.has(section.id);
}

function isIndexSection(section: SectionDef): boolean {
  return !section.hidden;
}

const SECTIONS_BY_GROUP = new Map<SettingsGroup, SectionDef[]>();
for (const section of SECTIONS) {
  if (!isIndexSection(section)) continue;
  const list = SECTIONS_BY_GROUP.get(section.group) ?? [];
  list.push(section);
  SECTIONS_BY_GROUP.set(section.group, list);
}

const _GROUP_BY_PATH = new Map<string, SettingsGroup>(
  SECTIONS.map((section) => [section.path, section.group]),
);
const SECTION_BY_PATH = new Map<string, SectionDef>(
  SECTIONS.map((section) => [section.path, section]),
);

export function sectionForPath(path: string): SectionDef | undefined {
  return SECTION_BY_PATH.get(path);
}

const SECTION_BY_ID = new Map<string, SectionDef>(
  SECTIONS.map((section) => [section.id, section]),
);

export function sectionForId(id: string): SectionDef | undefined {
  return SECTION_BY_ID.get(id);
}

interface SettingsMasterGroup {
  group: SettingsGroup;
  label: string;
  sections: SectionDef[];
}

export const SETTINGS_MASTER_GROUPS: SettingsMasterGroup[] =
  SETTINGS_GROUP_ORDER.flatMap((group) => {
    const sections = SECTIONS_BY_GROUP.get(group) ?? [];
    if (sections.length === 0) return [];
    return [{ group, label: SETTINGS_GROUP_LABELS[group], sections }];
  });
