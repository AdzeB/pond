import type { IconComponent } from "@pond/icons/types";
import {
  SETTINGS_DEV_GROUPS,
  SETTINGS_SECTIONS,
  type SettingsGroup,
  type SettingsSection,
} from "@pond/schema";
import {
  Clock,
  Download,
  FolderOpen,
  HardDrive,
  Palette,
  SlidersHorizontal,
  Tag,
  Terminal,
} from "lucide-react";
import type { ComponentType } from "react";

type SectionGroup = SettingsGroup;

interface SectionDef extends SettingsSection {
  icon: IconComponent;
  // Dynamic import so settings sections stay out of the initial bundle.
  // Each section ships as its own vendor-* chunk (see manualChunks in
  // electron.vite.config.ts).
  load: () => Promise<{ Component: ComponentType }>;
}

function lazyComponent<K extends string>(
  loader: () => Promise<Record<K, ComponentType>>,
  key: K,
): () => Promise<{ Component: ComponentType }> {
  return async () => ({ Component: (await loader())[key] });
}

const RENDERER_BY_ID: Record<
  string,
  {
    icon: IconComponent;
    load: () => Promise<{ Component: ComponentType }>;
  }
> = {
  general: {
    icon: SlidersHorizontal,
    load: lazyComponent(() => import("./sections/general"), "GeneralSection"),
  },
  appearance: {
    icon: Palette,
    load: lazyComponent(
      () => import("./sections/appearance"),
      "AppearanceSection",
    ),
  },
  storage: {
    icon: HardDrive,
    load: lazyComponent(() => import("./sections/storage"), "StorageSection"),
  },
  location: {
    icon: FolderOpen,
    load: lazyComponent(() => import("./sections/location"), "LocationSection"),
  },
  downloads: {
    icon: Download,
    load: lazyComponent(
      () => import("./sections/downloads"),
      "DownloadsSection",
    ),
  },
  "auto-tags": {
    icon: Tag,
    load: lazyComponent(
      () => import("./sections/auto-tags"),
      "AutoTagsSection",
    ),
  },
  schedule: {
    icon: Clock,
    load: lazyComponent(() => import("./sections/schedule"), "ScheduleSection"),
  },
  developer: {
    icon: Terminal,
    load: lazyComponent(
      () => import("./sections/developer"),
      "DeveloperSection",
    ),
  },
};

export const SECTIONS: SectionDef[] = SETTINGS_SECTIONS.map((section) => {
  const renderer = RENDERER_BY_ID[section.id];
  if (!renderer) {
    throw new Error(`settings registry missing renderer for "${section.id}"`);
  }
  return { ...section, ...renderer };
});

export const GROUP_ORDER: readonly SectionGroup[] = [
  "app",
  "library",
  "saving",
  "dev",
] as const;

export const GROUP_LABELS: Record<SectionGroup, string | null> = {
  app: null,
  library: "Library",
  saving: "Saving",
  dev: "Development",
};

export const DEV_GROUPS: readonly SectionGroup[] = SETTINGS_DEV_GROUPS;

export function sectionsByGroup(group: SectionGroup): SectionDef[] {
  return SECTIONS.filter((s) => s.group === group);
}

function pickDefault(): SectionDef {
  const first = SECTIONS[0];
  if (!first) throw new Error("settings registry is empty");
  return first;
}

export const DEFAULT_SECTION: SectionDef = pickDefault();
