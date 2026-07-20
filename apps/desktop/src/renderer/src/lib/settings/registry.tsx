import {
  IconColorPaletteOutline18 as Appearance,
  IconNodes3Outline18 as Connections,
  IconCode2Outline18 as Developer,
  IconDownloadOutline18 as Downloads,
  IconOrbitSparkleOutline18 as Enrichment,
  IconGear3Outline18 as General,
  IconImageOutline18 as Images,
  IconFaceRobot2Outline18 as Models,
  IconCommandOutline18 as Skills,
  IconMsg2Outline18 as Sparkle,
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
import type { SectionConfig } from "@/components/settings-engine";
import { SECTION_CONFIGS } from "@/lib/settings/sections";

const ICONS: Record<string, IconComponent> = {
  general: General,
  appearance: Appearance,
  tags: Tags,
  trash: Trash,
  storage: Storage,
  connections: Connections,
  funnel: Downloads,
  videos: Videos,
  images: Images,
  ai: Sparkle,
  "ai-providers": Models,
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

/** Bespoke sections bring their own full-page layout, opting their whole tab out of the two-column masonry. */
const BESPOKE_SECTION_IDS = new Set(["tags", "skills"]);

export function isBespokeSection(section: SectionDef): boolean {
  return BESPOKE_SECTION_IDS.has(section.id);
}

/** Hidden sections are routable but never shown as their own row in the index. */
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

const SETTINGS_MASTER_GROUPS: SettingsMasterGroup[] =
  SETTINGS_GROUP_ORDER.flatMap((group) => {
    const sections = SECTIONS_BY_GROUP.get(group) ?? [];
    if (sections.length === 0) return [];
    return [{ group, label: SETTINGS_GROUP_LABELS[group], sections }];
  });

export function settingsMasterGroupsForPackaged(
  isPackaged: boolean,
): SettingsMasterGroup[] {
  if (!isPackaged) return SETTINGS_MASTER_GROUPS;
  return SETTINGS_MASTER_GROUPS.map((group) => ({
    ...group,
    sections: group.sections.filter((section) => section.id !== "developer"),
  })).filter((group) => group.sections.length > 0);
}
