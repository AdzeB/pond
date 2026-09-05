import { lazy } from "react";
import type { SectionConfig } from "@/features/settings/components/engine/engine";
import { appearanceSection } from "@/features/settings/lib/config-appearance";
import { enrichmentSection } from "@/features/settings/lib/config-enrichment";
import { generalSection } from "@/features/settings/lib/config-general";
import { imagesSection } from "@/features/settings/lib/config-images";
import { mcpSection } from "@/features/settings/lib/config-mcp";
import { storageSection } from "@/features/settings/lib/config-storage";
import { trashSection } from "@/features/settings/lib/config-trash";
import { videosSection } from "@/features/settings/lib/config-videos";

const TagsSection = lazy(() =>
  import("@/features/tags/components/manager/manager").then((m) => ({
    default: m.TagsSection,
  })),
);
const AgentSection = lazy(() =>
  import("@/features/settings/components/sections/agent/agent").then((m) => ({
    default: m.AgentSection,
  })),
);
const McpSection = lazy(() =>
  import("@/features/settings/components/sections/mcp/mcp").then((m) => ({
    default: m.McpSection,
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
    "models",
    {
      component: AgentSection,
      title: "Models",
      description:
        "Add providers, then pick Language and Vision defaults for Agent.",
      keywords: [
        "ai",
        "agent",
        "openai",
        "anthropic",
        "gemini",
        "ollama",
        "key",
        "provider",
        "language",
        "vision",
        "default",
      ],
    },
  ],
  ["trash", trashSection],
  ["storage", storageSection],
  ["videos", videosSection],
  ["images", imagesSection],
  ["search", enrichmentSection],
  [
    "mcp",
    {
      ...mcpSection,
      component: McpSection,
    },
  ],
]);
