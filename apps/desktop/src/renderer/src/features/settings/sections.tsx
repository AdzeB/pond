import { lazy } from "react";
import type { SectionConfig } from "./engine";
import { appearanceSection } from "./sections/appearance.config";
import { generalSection } from "./sections/general.config";
import { imagesSection } from "./sections/images.config";
import { videosSection } from "./sections/videos.config";

// Registry of section configs; bespoke sections are lazy so each ships in its own chunk.
const ScheduleSection = lazy(() =>
  import("./sections/schedule").then((m) => ({ default: m.ScheduleSection })),
);
const DeveloperSection = lazy(() =>
  import("./sections/developer").then((m) => ({ default: m.DeveloperSection })),
);
const TagsSection = lazy(() =>
  import("@/features/tags/section").then((m) => ({ default: m.TagsSection })),
);

export const SECTION_CONFIGS: Record<string, SectionConfig> = {
  general: generalSection,
  appearance: appearanceSection,
  videos: videosSection,
  images: imagesSection,
  tags: { component: TagsSection },
  schedule: { component: ScheduleSection },
  developer: { component: DeveloperSection },
};
