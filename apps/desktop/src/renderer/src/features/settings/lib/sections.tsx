import { EXTERNAL_SOURCE_IDS } from "@pond/schema/sources";
import { lazy } from "react";
import type { SectionConfig } from "@/features/settings/components/engine";
import { appearanceSection } from "@/features/settings/lib/config-appearance";
import { backupsSection } from "@/features/settings/lib/config-backups";
import { extensionSection } from "@/features/settings/lib/config-extension";
import { generalSection } from "@/features/settings/lib/config-general";
import {
  scheduleSection,
  sourcesSection,
} from "@/features/settings/lib/config-harvesting";
import { imagesSection } from "@/features/settings/lib/config-images";
import { librarySection } from "@/features/settings/lib/config-library";
import { mcpSection } from "@/features/settings/lib/config-mcp";
import { processingSection } from "@/features/settings/lib/config-processing";
import { sourceDownloadsSection } from "@/features/settings/lib/config-source-downloads";
import { storageSection } from "@/features/settings/lib/config-storage";
import { videosSection } from "@/features/settings/lib/config-videos";
import { viewerSection } from "@/features/settings/lib/config-viewer";
import { sourceSectionId } from "@/features/settings/lib/download-sources";

const TagsSection = lazy(() =>
  import("@/features/tags/manager").then((m) => ({
    default: m.TagsSection,
  })),
);
const AgentSection = lazy(() =>
  import("@/features/settings/components/sections/agent").then((m) => ({
    default: m.AgentSection,
  })),
);
const ModelsSection = lazy(() =>
  import("@/features/settings/components/sections/agent/models").then((m) => ({
    default: m.ModelsSection,
  })),
);
const PersonalizationSection = lazy(() =>
  import("@/features/settings/components/sections/agent/personalization").then(
    (m) => ({
      default: m.PersonalizationSection,
    }),
  ),
);
const McpSection = lazy(() =>
  import("@/features/settings/components/sections/mcp").then((m) => ({
    default: m.McpSection,
  })),
);
const ShortcutSettings = lazy(() =>
  import("@/features/shortcuts").then((m) => ({
    default: m.ShortcutSettings,
  })),
);
export const SECTION_CONFIGS = new Map<string, SectionConfig>([
  ["general", generalSection],
  ["viewer", viewerSection],
  ["appearance", appearanceSection],
  ["extension", extensionSection],
  [
    "shortcuts",
    {
      component: ShortcutSettings,
      title: "Hotkeys",
      keywords: ["hotkeys", "keys", "commands", "Eagle"],
    },
  ],
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
      title: "Providers",
      description:
        "Connect the AI providers Assistant uses with your keys or a local host you run.",
      keywords: [
        "ai",
        "agent",
        "openai",
        "anthropic",
        "gemini",
        "ollama",
        "key",
        "provider",
        "intelligence",
        "integrations",
        "language",
        "vision",
      ],
    },
  ],
  [
    "agent-models",
    {
      component: ModelsSection,
      title: "Models",
      description: "Choose which models appear in Assistant.",
      keywords: [
        "ai",
        "agent",
        "intelligence",
        "catalog",
        "visibility",
        "models",
        "pricing",
        "context",
      ],
    },
  ],
  [
    "personalization",
    {
      component: PersonalizationSection,
      title: "Personalization",
      description: "Give Assistant context about you and how you like replies.",
      keywords: [
        "ai",
        "agent",
        "intelligence",
        "personalisation",
        "profile",
        "instructions",
        "responses",
      ],
    },
  ],
  ["library", librarySection],
  ["storage", storageSection],
  ["backups", backupsSection],
  ["processing", processingSection],
  ["schedule", scheduleSection],
  ["sources", sourcesSection],
  ["images", imagesSection],
  ["videos", videosSection],
  [
    "mcp",
    {
      ...mcpSection,
      component: McpSection,
    },
  ],
  ...EXTERNAL_SOURCE_IDS.map((source): [string, SectionConfig] => [
    sourceSectionId(source),
    sourceDownloadsSection(source),
  ]),
]);
