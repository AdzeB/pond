import { lazy } from "react";
import type { SectionConfig } from "@/components/settings/engine";
import { appearanceSection } from "@/lib/settings/config-appearance";
import { enrichmentSection } from "@/lib/settings/config-enrichment";
import { generalSection } from "@/lib/settings/config-general";
import { imagesSection } from "@/lib/settings/config-images";
import { storageSection } from "@/lib/settings/config-storage";
import { trashSection } from "@/lib/settings/config-trash";
import { videosSection } from "@/lib/settings/config-videos";

/** Bespoke sections are lazy so each ships in its own chunk. */
const TagsSection = lazy(() =>
  import("@/components/settings/tags").then((m) => ({
    default: m.TagsSection,
  })),
);
const FunnelSection = lazy(() =>
  import("@/components/settings/funnel").then((m) => ({
    default: m.FunnelSection,
  })),
);
export const SECTION_CONFIGS: Record<string, SectionConfig> = {
  /** Bespoke sections render their own header and layout; their title/keywords are inert at render time and exist only for the settings search index. */
  general: generalSection,
  appearance: appearanceSection,
  tags: {
    component: TagsSection,
    title: "Tags",
    description: "Organize, merge, and archive tags.",
    keywords: ["labels", "groups", "merge", "archive", "rename", "organize"],
  },
  trash: trashSection,
  storage: storageSection,
  funnel: {
    component: FunnelSection,
    title: "Funnel",
    description: "In-progress, failed, and finished saves.",
    width: "wide",
    keywords: [
      "saves",
      "downloads",
      "queue",
      "progress",
      "saving",
      "failed",
      "retry",
      "ingest",
    ],
  },
  videos: videosSection,
  images: imagesSection,
  enrichment: enrichmentSection,
};
