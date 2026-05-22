import {
  IconBellOutline18,
  IconBoltOutline18,
  IconCircleInfoOutline18,
  IconClockRotateClockwiseOutline18,
  IconCloudOutline18,
  IconConnectedDotsOutline18,
  IconImagesOutline18,
  IconShapesOutline18,
  IconSliderOutline18,
  IconStackOutline18,
  IconTagOutline18,
  IconTerminalOutline18,
  IconTrash2ContentOutline18,
  IconWindowCode2Outline18,
  IconWorkflowOutline18,
} from "@pond/icons/outline/18";
import type { IconComponent } from "@pond/icons/types";
import type { ComponentType } from "react";

export type SectionGroup = "library" | "media" | "capture" | "app";

export interface SectionDef {
  id: string;
  path: string;
  label: string;
  icon: IconComponent;
  group: SectionGroup;
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

export const SECTIONS: SectionDef[] = [
  {
    id: "storage",
    path: "storage",
    label: "Storage",
    icon: IconStackOutline18,
    group: "library",
    load: lazyComponent(() => import("./sections/storage"), "StorageSection"),
  },
  {
    id: "tags",
    path: "tags",
    label: "Tags",
    icon: IconTagOutline18,
    group: "library",
    load: lazyComponent(() => import("./sections/tags"), "TagsSection"),
  },
  {
    id: "trash-prefs",
    path: "trash-prefs",
    label: "Trash",
    icon: IconTrash2ContentOutline18,
    group: "library",
    load: lazyComponent(() => import("./sections/trash"), "TrashPrefsSection"),
  },
  {
    id: "backups",
    path: "backups",
    label: "Backups & Export",
    icon: IconCloudOutline18,
    group: "library",
    load: lazyComponent(() => import("./sections/backups"), "BackupsSection"),
  },

  {
    id: "media",
    path: "media",
    label: "Media",
    icon: IconImagesOutline18,
    group: "media",
    load: lazyComponent(() => import("./sections/media"), "MediaSection"),
  },

  {
    id: "sources",
    path: "integrations",
    label: "Connected Apps",
    icon: IconConnectedDotsOutline18,
    group: "capture",
    load: lazyComponent(
      () => import("./sections/integrations"),
      "IntegrationsSection",
    ),
  },
  {
    id: "capture-behavior",
    path: "capture-behavior",
    label: "Capture Behavior",
    icon: IconBoltOutline18,
    group: "capture",
    load: lazyComponent(
      () => import("./sections/capture-behavior"),
      "CaptureBehaviorSection",
    ),
  },
  {
    id: "extension",
    path: "extension",
    label: "Browser Extension",
    icon: IconWindowCode2Outline18,
    group: "capture",
    load: lazyComponent(
      () => import("./sections/extension"),
      "ExtensionSection",
    ),
  },

  {
    id: "preferences",
    path: "preferences",
    label: "Preferences",
    icon: IconSliderOutline18,
    group: "app",
    load: lazyComponent(
      () => import("./sections/preferences"),
      "PreferencesSection",
    ),
  },
  {
    id: "notifications",
    path: "notifications",
    label: "Notifications",
    icon: IconBellOutline18,
    group: "app",
    load: lazyComponent(
      () => import("./sections/notifications"),
      "NotificationsSection",
    ),
  },
  {
    id: "updates",
    path: "updates",
    label: "Updates",
    icon: IconClockRotateClockwiseOutline18,
    group: "app",
    load: lazyComponent(() => import("./sections/updates"), "UpdatesSection"),
  },
  {
    id: "automation",
    path: "automation",
    label: "Automation",
    icon: IconWorkflowOutline18,
    group: "app",
    load: lazyComponent(
      () => import("./sections/automation"),
      "AutomationSection",
    ),
  },
  {
    id: "developer",
    path: "developer",
    label: "Developer",
    icon: IconTerminalOutline18,
    group: "app",
    load: lazyComponent(
      () => import("./sections/developer"),
      "DeveloperSection",
    ),
  },
  {
    id: "components",
    path: "components",
    label: "Components",
    icon: IconShapesOutline18,
    group: "app",
    load: lazyComponent(
      () => import("./sections/components"),
      "ComponentsSection",
    ),
  },
  {
    id: "about",
    path: "about",
    label: "About",
    icon: IconCircleInfoOutline18,
    group: "app",
    load: lazyComponent(() => import("./sections/about"), "AboutSection"),
  },
];

export const GROUP_ORDER: readonly SectionGroup[] = [
  "app",
  "library",
  "media",
  "capture",
] as const;

export const GROUP_LABELS: Record<SectionGroup, string | null> = {
  app: null,
  library: "Library",
  media: "Media",
  capture: "Capture",
};

export function sectionsByGroup(group: SectionGroup): SectionDef[] {
  return SECTIONS.filter((s) => s.group === group);
}

function pickDefault(): SectionDef {
  const first = SECTIONS[0];
  if (!first) throw new Error("settings registry is empty");
  return first;
}

export const DEFAULT_SECTION: SectionDef = pickDefault();
