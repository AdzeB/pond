export type SettingsGroup = "general" | "library" | "capture";

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
  {
    id: "enrichment",
    path: "enrichment",
    label: "Enrichments",
    group: "library",
  },
  { id: "trash", path: "trash", label: "Trash", group: "library" },
  { id: "storage", path: "storage", label: "Storage", group: "library" },
  { id: "videos", path: "videos", label: "Videos", group: "capture" },
  { id: "images", path: "images", label: "Images", group: "capture" },
];

export const SETTINGS_GROUP_ORDER: readonly SettingsGroup[] = [
  "general",
  "library",
  "capture",
];

export const SETTINGS_GROUP_LABELS = {
  general: "General",
  library: "Library",
  capture: "Capture",
} satisfies Record<SettingsGroup, string>;

export const SETTINGS_SECTION_ALIASES = {
  downloads: "videos",
  ai: "enrichment",
  "ai-models": "enrichment",
  "ai-providers": "enrichment",
  skills: "enrichment",
} satisfies Readonly<Record<string, string>>;
