import { lazy } from "react";
import type { SectionConfig } from "@/components/settings/engine";
import { appearanceSection } from "@/lib/settings/config-appearance";
import { enrichmentSection } from "@/lib/settings/config-enrichment";
import { generalSection } from "@/lib/settings/config-general";
import { imagesSection } from "@/lib/settings/config-images";
import { storageSection } from "@/lib/settings/config-storage";
import { trashSection } from "@/lib/settings/config-trash";
import { videosSection } from "@/lib/settings/config-videos";

const TagsSection = lazy(() =>
  import("@/components/settings/tags").then((m) => ({
    default: m.TagsSection,
  })),
);
const AgentSection = lazy(() =>
  import("@/components/settings/agent").then((m) => ({
    default: m.AgentSection,
  })),
);

export const SECTION_CONFIGS = new Map<string, SectionConfig>([
  ["general", generalSection],
  ["appearance", appearanceSection],
  [
    "tags",
    {
      component: TagsSection,
      title: "Tags",
      description: "Organize, merge, and archive tags.",
      keywords: ["labels", "groups", "merge", "archive", "rename", "organize"],
    },
  ],
  [
    "agent",
    {
      component: AgentSection,
      title: "Assistant",
      description: "Paste a provider key or stay on Minnow on this Mac.",
      keywords: ["ai", "openai", "anthropic", "gemini", "minnow", "key", "mcp"],
    },
  ],
  ["trash", trashSection],
  ["storage", storageSection],
  ["videos", videosSection],
  ["images", imagesSection],
  ["enrichment", enrichmentSection],
]);
