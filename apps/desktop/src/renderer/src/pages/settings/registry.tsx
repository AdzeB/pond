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
import {
  SETTINGS_SECTIONS,
  type SettingsGroup,
  type SettingsSection,
} from "@pond/schema";
import type { ComponentType } from "react";

export type SectionGroup = SettingsGroup;

export interface SectionDef extends SettingsSection {
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
  storage: {
    icon: IconStackOutline18,
    load: lazyComponent(() => import("./sections/storage"), "StorageSection"),
  },
  tags: {
    icon: IconTagOutline18,
    load: lazyComponent(() => import("./sections/tags"), "TagsSection"),
  },
  "trash-prefs": {
    icon: IconTrash2ContentOutline18,
    load: lazyComponent(() => import("./sections/trash"), "TrashPrefsSection"),
  },
  backups: {
    icon: IconCloudOutline18,
    load: lazyComponent(() => import("./sections/backups"), "BackupsSection"),
  },
  media: {
    icon: IconImagesOutline18,
    load: lazyComponent(() => import("./sections/media"), "MediaSection"),
  },
  sources: {
    icon: IconConnectedDotsOutline18,
    load: lazyComponent(
      () => import("./sections/integrations"),
      "IntegrationsSection",
    ),
  },
  "capture-behavior": {
    icon: IconBoltOutline18,
    load: lazyComponent(
      () => import("./sections/capture-behavior"),
      "CaptureBehaviorSection",
    ),
  },
  extension: {
    icon: IconWindowCode2Outline18,
    load: lazyComponent(
      () => import("./sections/extension"),
      "ExtensionSection",
    ),
  },
  preferences: {
    icon: IconSliderOutline18,
    load: lazyComponent(
      () => import("./sections/preferences"),
      "PreferencesSection",
    ),
  },
  notifications: {
    icon: IconBellOutline18,
    load: lazyComponent(
      () => import("./sections/notifications"),
      "NotificationsSection",
    ),
  },
  updates: {
    icon: IconClockRotateClockwiseOutline18,
    load: lazyComponent(() => import("./sections/updates"), "UpdatesSection"),
  },
  automation: {
    icon: IconWorkflowOutline18,
    load: lazyComponent(
      () => import("./sections/automation"),
      "AutomationSection",
    ),
  },
  developer: {
    icon: IconTerminalOutline18,
    load: lazyComponent(
      () => import("./sections/developer"),
      "DeveloperSection",
    ),
  },
  components: {
    icon: IconShapesOutline18,
    load: lazyComponent(
      () => import("./sections/components"),
      "ComponentsSection",
    ),
  },
  about: {
    icon: IconCircleInfoOutline18,
    load: lazyComponent(() => import("./sections/about"), "AboutSection"),
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
