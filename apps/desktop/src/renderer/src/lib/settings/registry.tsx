import {
  IconColorPaletteFill18 as Appearance,
  IconPlugFill18 as Connections,
  IconTerminalFill18 as Developer,
  IconWandSparkleFill18 as Enrichment,
  IconGear3Fill18 as General,
  IconImageFill18 as Images,
  IconMicrochipFill18 as Models,
  IconCommandFill18 as Skills,
  IconSparkleFill18 as Sparkle,
  IconHardDriveFill18 as Storage,
  IconArrowRotateClockwiseFill18 as Sync,
  IconTagsFill18 as Tags,
  IconTrash2Fill18 as Trash,
  IconPresentationScreenPlayFill18 as Videos,
} from "@pond/icons/fill/18";
import type { IconComponent } from "@pond/icons/types";
import {
  SETTINGS_GROUP_LABELS,
  SETTINGS_GROUP_ORDER,
  SETTINGS_SECTIONS,
  type SettingsGroup,
  type SettingsSection,
} from "@pond/schema";
import type { SectionConfig } from "@/components/settings-engine";
import { SECTION_CONFIGS } from "@/lib/settings/sections";

const ICONS: Record<string, IconComponent> = {
  general: General,
  appearance: Appearance,
  tags: Tags,
  trash: Trash,
  storage: Storage,
  connections: Connections,
  sync: Sync,
  videos: Videos,
  images: Images,
  ai: Sparkle,
  "ai-models": Models,
  enrichment: Enrichment,
  skills: Skills,
  developer: Developer,
};

export interface SectionDef extends SettingsSection {
  icon: IconComponent;
  config: SectionConfig;
}

export const SECTIONS: SectionDef[] = SETTINGS_SECTIONS.map((section) => {
  const icon = ICONS[section.id];
  const config = SECTION_CONFIGS[section.id];
  if (!icon || !config) {
    throw new Error(`settings registry missing renderer for "${section.id}"`);
  }
  return { ...section, icon, config };
});

// Bespoke sections bring their own full-page layout; they render full-width and
// opt their whole tab out of the two-column masonry.
const BESPOKE_SECTION_IDS = new Set(["tags", "ai"]);

export function isBespokeSection(section: SectionDef): boolean {
  return BESPOKE_SECTION_IDS.has(section.id);
}

// Child sections (those with a `parent`) and explicitly hidden sections are
// routable but never shown as their own row in the settings index.
function isIndexSection(section: SectionDef): boolean {
  return !section.parent && !section.hidden;
}

// Sub-sections nested under a hub, in their declared order.
export function childrenOf(parentId: string): SectionDef[] {
  return SECTIONS.filter((section) => section.parent === parentId);
}

export const SECTIONS_BY_GROUP = new Map<SettingsGroup, SectionDef[]>();
for (const section of SECTIONS) {
  if (!isIndexSection(section)) continue;
  const list = SECTIONS_BY_GROUP.get(section.group) ?? [];
  list.push(section);
  SECTIONS_BY_GROUP.set(section.group, list);
}

const GROUP_BY_PATH = new Map<string, SettingsGroup>(
  SECTIONS.map((section) => [section.path, section.group]),
);

export function groupForPath(path: string): SettingsGroup | undefined {
  return GROUP_BY_PATH.get(path);
}

export function sectionsForGroup(group: SettingsGroup): SectionDef[] {
  return SECTIONS_BY_GROUP.get(group) ?? [];
}

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

export interface SettingsMasterGroup {
  group: SettingsGroup;
  label: string;
  sections: SectionDef[];
}

// The master list: every section row, clustered under its group label, in the
// schema-defined group order.
export const SETTINGS_MASTER_GROUPS: SettingsMasterGroup[] =
  SETTINGS_GROUP_ORDER.flatMap((group) => {
    const sections = SECTIONS_BY_GROUP.get(group) ?? [];
    if (sections.length === 0) return [];
    return [{ group, label: SETTINGS_GROUP_LABELS[group], sections }];
  });
