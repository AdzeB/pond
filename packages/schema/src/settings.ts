export type SettingsGroup = "app" | "library" | "saving" | "dev";

export interface SettingsSection {
  id: string;
  path: string;
  label: string;
  group: SettingsGroup;
}

export const SETTINGS_SECTIONS: readonly SettingsSection[] = [
  { id: "general", path: "general", label: "General", group: "app" },
  { id: "appearance", path: "appearance", label: "Appearance", group: "app" },
  { id: "tags", path: "tags", label: "Tags", group: "library" },
  { id: "videos", path: "videos", label: "Videos", group: "saving" },
  { id: "images", path: "images", label: "Images", group: "saving" },
  { id: "schedule", path: "schedule", label: "Schedule", group: "saving" },
  { id: "developer", path: "developer", label: "Developer", group: "dev" },
];

export const SETTINGS_GROUP_ORDER: readonly SettingsGroup[] = [
  "app",
  "library",
  "saving",
  "dev",
];

export const SETTINGS_GROUP_LABELS: Partial<Record<SettingsGroup, string>> = {
  library: "Library",
  saving: "Saving",
};

export const SETTINGS_DEV_GROUPS: readonly SettingsGroup[] = ["dev"];

export const SETTINGS_SECTION_ALIASES: Readonly<Record<string, string>> = {
  downloads: "videos",
};
