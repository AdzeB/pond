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
  {
    id: "shortcuts",
    path: "shortcuts",
    label: "Browser Extension",
    group: "app",
  },
  { id: "library", path: "library", label: "Library", group: "library" },
  { id: "saving", path: "saving", label: "Saving", group: "saving" },
  {
    id: "sources",
    path: "integrations",
    label: "Connected Apps",
    group: "saving",
  },
  { id: "components", path: "components", label: "Components", group: "dev" },
  { id: "developer", path: "developer", label: "Developer", group: "dev" },
] as const;

export const SETTINGS_DEV_GROUPS: readonly SettingsGroup[] = ["dev"] as const;
