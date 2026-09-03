export type SettingsGroup = "general" | "library" | "ai" | "capture";

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
  {
    id: "appearance",
    path: "appearance",
    label: "Appearance",
    group: "general",
  },
  { id: "tags", path: "tags", label: "Tags", group: "library" },
  { id: "trash", path: "trash", label: "Trash", group: "library" },
  { id: "storage", path: "storage", label: "Storage", group: "library" },
  { id: "search", path: "search", label: "Search", group: "ai" },
  { id: "models", path: "models", label: "Models", group: "ai" },
  { id: "mcp", path: "mcp", label: "MCP", group: "ai" },
  { id: "videos", path: "videos", label: "Videos", group: "capture" },
  { id: "images", path: "images", label: "Images", group: "capture" },
];

export const SETTINGS_GROUP_ORDER: readonly SettingsGroup[] = [
  "general",
  "library",
  "ai",
  "capture",
];

export const SETTINGS_GROUP_LABELS = {
  general: "General",
  library: "Library",
  ai: "AI",
  capture: "Capture",
} satisfies Record<SettingsGroup, string>;

export const SETTINGS_SECTION_ALIASES = {
  downloads: "videos",
  agent: "models",
  ai: "models",
  "ai-models": "models",
  "ai-providers": "models",
  enrichment: "search",
  skills: "search",
} satisfies Readonly<Record<string, string>>;
