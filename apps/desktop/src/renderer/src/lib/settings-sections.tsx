import { lazy } from "react";
import type { SectionConfig } from "@/components/settings-engine";
import { appearanceSection } from "./settings-config-appearance";
import { generalSection } from "./settings-config-general";
import { imagesSection } from "./settings-config-images";
import { videosSection } from "./settings-config-videos";

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

export const SECTION_CONFIGS: Record<string, SectionConfig> = {
  general: generalSection,
  appearance: appearanceSection,
  library: { component: LibrarySection },
  videos: videosSection,
  images: imagesSection,
  tags: { component: TagsSection },
  developer: { component: DeveloperSection },
};
