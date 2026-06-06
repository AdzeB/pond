export type SettingsGroup = "app" | "library" | "saving" | "dev";

export interface SettingsSection {
  id: string;
  path: string;
  label: string;
  group: SettingsGroup;
}

// Nav metadata (SETTINGS_SECTIONS, SETTINGS_DEV_GROUPS, SETTINGS_SECTION_ICONS)
// is generated from the settings manifest. See
// packages/schema/scripts/generate-settings.ts.
export * from "./settings/nav.generated";
