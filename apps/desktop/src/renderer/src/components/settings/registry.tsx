import {
  IconColorPaletteFill18 as Appearance,
  IconTerminalFill18 as Developer,
  IconGear3Fill18 as General,
  IconImageFill18 as Images,
  IconCalendarClockFill18 as Schedule,
  IconPresentationScreenPlayFill18 as Videos,
} from "@pond/icons/fill/18";
import type { IconComponent } from "@pond/icons/types";
import {
  SETTINGS_DEV_GROUPS,
  SETTINGS_SECTIONS,
  type SettingsGroup,
  type SettingsSection,
} from "@pond/schema";
import type { SectionConfig } from "./engine";
import { SECTION_CONFIGS } from "./sections";

const ICONS: Record<string, IconComponent> = {
  general: General,
  appearance: Appearance,
  videos: Videos,
  images: Images,
  schedule: Schedule,
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

function pickDefault(): SectionDef {
  const first = SECTIONS[0];
  if (!first) throw new Error("settings registry is empty");
  return first;
}

export const DEFAULT_SECTION: SectionDef = pickDefault();
