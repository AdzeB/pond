import {
  IconColorPaletteFill18 as Appearance,
  IconTerminalFill18 as Developer,
  IconWandSparkleFill18 as Enrichment,
  IconGear3Fill18 as General,
  IconImageFill18 as Images,
  IconArchiveFill18 as Library,
  IconSparkleFill18 as Sparkle,
  IconTagsFill18 as Tags,
  IconListCheckboxFill18 as Tasks,
  IconPresentationScreenPlayFill18 as Videos,
} from "@pond/icons/fill/18";
import type { IconComponent } from "@pond/icons/types";
import {
  SETTINGS_DEV_GROUPS,
  SETTINGS_SECTIONS,
  type SettingsGroup,
  type SettingsSection,
} from "@pond/schema";
import type { SectionConfig } from "@/components/settings-engine";
import { SECTION_CONFIGS } from "./settings-sections";

const ICONS: Record<string, IconComponent> = {
  general: General,
  appearance: Appearance,
  library: Library,
  tags: Tags,
  videos: Videos,
  images: Images,
  ai: Sparkle,
  enrichment: Enrichment,
  tasks: Tasks,
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

export const DEV_GROUPS: readonly SettingsGroup[] = SETTINGS_DEV_GROUPS;
