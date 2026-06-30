export type SettingsGroup =
  | "general"
  | "library"
  | "capture"
  | "intelligence"
  | "advanced";

export interface SettingsSection {
  id: string;
  path: string;
  label: string;
  group: SettingsGroup;
  // When set, this section is a child of the given hub section: it renders
  // nested (breadcrumb) and is hidden from the top-level settings index.
  parent?: string;
  // Hide from the top-level settings index regardless of parentage.
  hidden?: boolean;
}

export const SETTINGS_SECTIONS: readonly SettingsSection[] = [
  { id: "general", path: "general", label: "General", group: "general" },
  {
    id: "appearance",
    path: "appearance",
    label: "Appearance",
    group: "general",
  },
  { id: "tags", path: "tags", label: "Tags", group: "library" },
  { id: "trash", path: "trash", label: "Trash", group: "library" },
  { id: "storage", path: "storage", label: "Storage", group: "library" },
  {
    id: "connections",
    path: "connections",
    label: "Connections",
    group: "capture",
  },
  { id: "sync", path: "sync", label: "Sync", group: "capture" },
  { id: "videos", path: "videos", label: "Videos", group: "capture" },
  { id: "images", path: "images", label: "Images", group: "capture" },
  {
    id: "ai",
    path: "ai",
    label: "Artificial Intelligence",
    group: "intelligence",
  },
  {
    id: "ai-models",
    path: "ai-models",
    label: "Models",
    group: "intelligence",
    parent: "ai",
  },
  {
    id: "enrichment",
    path: "enrichment",
    label: "Enrichment",
    group: "intelligence",
    parent: "ai",
  },
  {
    id: "skills",
    path: "skills",
    label: "Skills",
    group: "intelligence",
    parent: "ai",
  },
  { id: "developer", path: "developer", label: "Developer", group: "advanced" },
];

export const SETTINGS_GROUP_ORDER: readonly SettingsGroup[] = [
  "general",
  "library",
  "capture",
  "intelligence",
  "advanced",
];

export const SETTINGS_GROUP_LABELS: Record<SettingsGroup, string> = {
  general: "General",
  library: "Library",
  capture: "Capturing",
  intelligence: "Intelligence",
  advanced: "Advanced",
};

export const SETTINGS_SECTION_ALIASES: Readonly<Record<string, string>> = {
  downloads: "videos",
};
