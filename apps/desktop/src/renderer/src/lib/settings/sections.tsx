import { lazy } from "react";
import type { SectionConfig } from "@/components/settings-engine";
import { appearanceSection } from "@/lib/settings/config-appearance";
import { generalSection } from "@/lib/settings/config-general";
import { imagesSection } from "@/lib/settings/config-images";
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
const LibrarySection = lazy(() =>
  import("@/components/settings-section-library").then((m) => ({
    default: m.LibrarySection,
  })),
);
const AiSection = lazy(() =>
  import("@/components/settings-ai").then((m) => ({
    default: m.AiSection,
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
  library: { component: LibrarySection },
  videos: videosSection,
  images: imagesSection,
  tags: { component: TagsSection },
  ai: { component: AiSection },
  enrichment: { component: EnrichmentSection },
  developer: { component: DeveloperSection },
};
