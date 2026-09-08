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
  { id: "general", path: "general", label: "General", group: "general" },
  {
    id: "appearance",
    path: "appearance",
    label: "Appearance",
    group: "general",
  },
  {
    id: "schedule",
    path: "schedule",
    label: "Fetching",
    hidden: true,
    group: "library",
  },
  { id: "tags", path: "tags", label: "Tags", hidden: true, group: "library" },
  {
    id: "trash",
    path: "trash",
    label: "Trash",
    hidden: true,
    group: "library",
  },
  {
    id: "storage",
    path: "storage",
    label: "Storage & Backups",
    group: "library",
  },
  {
    id: "search",
    path: "search",
    label: "Search & Processing",
    group: "library",
  },
  { id: "models", path: "models", label: "Integrations", group: "general" },
  { id: "mcp", path: "mcp", label: "MCP", hidden: true, group: "ai" },
  { id: "videos", path: "videos", label: "Harvesting", group: "library" },
  {
    id: "images",
    path: "images",
    label: "Images",
    hidden: true,
    group: "capture",
  },
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
  harvesting: "videos",
  schedule: "videos",
  fetching: "videos",
  images: "videos",
  trash: "storage",
  mcp: "models",
  agent: "models",
  ai: "models",
  "ai-models": "models",
  "ai-providers": "models",
  enrichment: "search",
  skills: "search",
} satisfies Readonly<Record<string, string>>;
