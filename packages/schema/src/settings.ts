export type SettingsGroup = "general" | "library" | "ai";

export interface SettingsSection {
  id: string;
  path: string;
  label: string;
  group: SettingsGroup;
  hidden?: boolean;
  parent?: string;
}

export const SETTINGS_SECTIONS: readonly SettingsSection[] = [
  { id: "general", path: "general", label: "Preferences", group: "general" },
  { id: "viewer", path: "viewer", label: "Preview", group: "general" },
  {
    id: "appearance",
    path: "appearance",
    label: "Appearance",
    group: "general",
  },
  {
    id: "shortcuts",
    path: "shortcuts",
    label: "Hotkeys",
    group: "general",
  },
  { id: "tags", path: "tags", label: "Tags", hidden: true, group: "library" },
  {
    id: "library",
    path: "library",
    label: "Library",
    group: "library",
  },
  {
    id: "storage",
    path: "storage",
    label: "Storage",
    group: "library",
  },
  { id: "backups", path: "backups", label: "Backups", group: "library" },
  {
    id: "processing",
    path: "processing",
    label: "Processing",
    group: "library",
  },
  {
    id: "harvesting",
    path: "harvesting",
    label: "Harvesting",
    group: "library",
  },
  { id: "models", path: "models", label: "Providers", group: "ai" },
  { id: "agent-models", path: "agent-models", label: "Models", group: "ai" },
  {
    id: "personalization",
    path: "personalization",
    label: "Personalization",
    group: "ai",
  },
  { id: "mcp", path: "mcp", label: "Model Context Protocol", group: "ai" },
];

export const SETTINGS_GROUP_ORDER: readonly SettingsGroup[] = [
  "general",
  "library",
  "ai",
];

export const SETTINGS_GROUP_LABELS = {
  general: null,
  library: "Workspace",
  ai: "Intelligence",
} satisfies Record<SettingsGroup, string | null>;
