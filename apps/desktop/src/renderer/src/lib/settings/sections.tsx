import { lazy } from "react";
import type { SectionConfig } from "@/components/settings-engine";
import { appearanceSection } from "@/lib/settings/config-appearance";
import { generalSection } from "@/lib/settings/config-general";
import { imagesSection } from "@/lib/settings/config-images";
import { storageSection } from "@/lib/settings/config-storage";
import { trashSection } from "@/lib/settings/config-trash";
import { videosSection } from "@/lib/settings/config-videos";

// Registry of section configs; bespoke sections are lazy so each ships in its own chunk.
const DeveloperSection = lazy(() =>
  import("@/components/settings-section-developer").then((m) => ({
    default: m.DeveloperSection,
  })),
);
const TagsSection = lazy(() =>
  import("@/components/settings-tags").then((m) => ({
    default: m.TagsSection,
  })),
);
const ConnectionsSection = lazy(() =>
  import("@/components/settings-section-developer-api-section").then((m) => ({
    default: m.DeveloperApiSection,
  })),
);
const SyncSection = lazy(() =>
  import("@/components/settings-sync").then((m) => ({
    default: m.SyncSection,
  })),
);
const SkillsSection = lazy(() =>
  import("@/components/settings-skills").then((m) => ({
    default: m.SkillsSection,
  })),
);
const AiHub = lazy(() =>
  import("@/components/settings-ai").then((m) => ({
    default: m.AiHub,
  })),
);
const AiModelsSection = lazy(() =>
  import("@/components/settings-ai-models").then((m) => ({
    default: m.AiModelsSection,
  })),
);
const EnrichmentSection = lazy(() =>
  import("@/components/settings-enrichment").then((m) => ({
    default: m.EnrichmentSection,
  })),
);

export const SECTION_CONFIGS: Record<string, SectionConfig> = {
  general: generalSection,
  appearance: appearanceSection,
  tags: { component: TagsSection },
  trash: trashSection,
  storage: storageSection,
  connections: { component: ConnectionsSection },
  sync: { component: SyncSection },
  videos: videosSection,
  images: imagesSection,
  ai: { component: AiHub },
  "ai-models": { component: AiModelsSection },
  enrichment: { component: EnrichmentSection },
  skills: { component: SkillsSection },
  developer: { component: DeveloperSection },
};
