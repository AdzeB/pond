import type { IconComponent } from "@pond/icons/types";
import {
  SETTINGS_DEV_GROUPS,
  SETTINGS_SECTION_ICONS,
  SETTINGS_SECTIONS,
  type SettingsGroup,
  type SettingsSection,
} from "@pond/schema";
import type { SectionConfig } from "./engine";
import { icons } from "./registry.runtime";
import { SECTION_CONFIGS } from "./sections.generated";

type SectionGroup = SettingsGroup;

interface SectionDef extends SettingsSection {
  icon: IconComponent;
  config: SectionConfig;
}

export const SECTIONS: SectionDef[] = SETTINGS_SECTIONS.map((section) => {
  const icon = icons[SETTINGS_SECTION_ICONS[section.id] ?? ""];
  const config = SECTION_CONFIGS[section.id];
  if (!icon || !config) {
    throw new Error(`settings registry missing renderer for "${section.id}"`);
  }
  return { ...section, icon, config };
});

export const DEV_GROUPS: readonly SectionGroup[] = SETTINGS_DEV_GROUPS;

function pickDefault(): SectionDef {
  const first = SECTIONS[0];
  if (!first) throw new Error("settings registry is empty");
  return first;
}

export const DEFAULT_SECTION: SectionDef = pickDefault();
