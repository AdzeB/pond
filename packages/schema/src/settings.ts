export type SettingsGroup = "app" | "library" | "saving" | "dev";

export interface SettingsSection {
  id: string;
  path: string;
  label: string;
  group: SettingsGroup;
}

export const SETTINGS_SECTIONS: readonly SettingsSection[] = [
  { id: "general", path: "general", label: "General", group: "app" },
  {
    id: "appearance",
    path: "appearance",
    label: "Appearance",
    group: "app",
  },
  { id: "storage", path: "storage", label: "Storage", group: "library" },
  { id: "location", path: "location", label: "Location", group: "library" },
  { id: "downloads", path: "downloads", label: "Downloads", group: "saving" },
  { id: "schedule", path: "schedule", label: "Schedule", group: "saving" },
  { id: "developer", path: "developer", label: "Developer", group: "dev" },
] as const;

export const SETTINGS_DEV_GROUPS: readonly SettingsGroup[] = ["dev"] as const;
