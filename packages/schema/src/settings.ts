export type SettingsGroup =
  | "app"
  | "library"
  | "intelligence"
  | "saving"
  | "dev";

export interface SettingsSection {
  id: string;
  path: string;
  label: string;
  group: SettingsGroup;
}

export const SETTINGS_SECTIONS: readonly SettingsSection[] = [
  { id: "general", path: "general", label: "General", group: "app" },
  { id: "appearance", path: "appearance", label: "Appearance", group: "app" },
  { id: "library", path: "library", label: "Library", group: "library" },
  { id: "tags", path: "tags", label: "Tags", group: "library" },
  { id: "videos", path: "videos", label: "Videos", group: "saving" },
  { id: "images", path: "images", label: "Images", group: "saving" },
  { id: "ai", path: "ai", label: "AI", group: "intelligence" },
  {
    id: "enrichment",
    path: "enrichment",
    label: "Enrichment",
    group: "intelligence",
  },
  { id: "tasks", path: "tasks", label: "Tasks", group: "intelligence" },
  { id: "developer", path: "developer", label: "Developer", group: "dev" },
];

export const SETTINGS_GROUP_ORDER: readonly SettingsGroup[] = [
  "app",
  "library",
  "intelligence",
  "saving",
  "dev",
];

export const SETTINGS_GROUP_LABELS: Partial<Record<SettingsGroup, string>> = {
  library: "Library",
  intelligence: "Intelligence",
  saving: "Saving",
};

export const SETTINGS_DEV_GROUPS: readonly SettingsGroup[] = ["dev"];

export const SETTINGS_SECTION_ALIASES: Readonly<Record<string, string>> = {
  downloads: "videos",
};
