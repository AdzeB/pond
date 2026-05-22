export type SettingsGroup = "library" | "media" | "capture" | "app";

export interface SettingsSection {
  id: string;
  path: string;
  label: string;
  group: SettingsGroup;
}

export const SETTINGS_SECTIONS: readonly SettingsSection[] = [
  { id: "storage", path: "storage", label: "Storage", group: "library" },
  { id: "tags", path: "tags", label: "Tags", group: "library" },
  { id: "trash-prefs", path: "trash-prefs", label: "Trash", group: "library" },
  {
    id: "backups",
    path: "backups",
    label: "Backups & Export",
    group: "library",
  },
  { id: "media", path: "media", label: "Media", group: "media" },
  {
    id: "sources",
    path: "integrations",
    label: "Connected Apps",
    group: "capture",
  },
  {
    id: "capture-behavior",
    path: "capture-behavior",
    label: "Capture Behavior",
    group: "capture",
  },
  {
    id: "extension",
    path: "extension",
    label: "Browser Extension",
    group: "capture",
  },
  {
    id: "preferences",
    path: "preferences",
    label: "Preferences",
    group: "app",
  },
  {
    id: "notifications",
    path: "notifications",
    label: "Notifications",
    group: "app",
  },
  { id: "updates", path: "updates", label: "Updates", group: "app" },
  { id: "automation", path: "automation", label: "Automation", group: "app" },
  { id: "developer", path: "developer", label: "Developer", group: "app" },
  { id: "components", path: "components", label: "Components", group: "app" },
  { id: "about", path: "about", label: "About", group: "app" },
] as const;
