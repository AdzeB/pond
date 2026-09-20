import { lazy } from "react";
import type { SectionConfig } from "@/features/settings/components/engine/engine";
import { appearanceSection } from "@/features/settings/lib/config-appearance";
import { backupsSection } from "@/features/settings/lib/config-backups";
import { generalSection } from "@/features/settings/lib/config-general";
import { harvestingSection } from "@/features/settings/lib/config-harvesting";
import { librarySection } from "@/features/settings/lib/config-library";
import { mcpSection } from "@/features/settings/lib/config-mcp";
import { processingSection } from "@/features/settings/lib/config-processing";
import { searchSection } from "@/features/settings/lib/config-search";
import { storageSection } from "@/features/settings/lib/config-storage";
import { viewerSection } from "@/features/settings/lib/config-viewer";

const TagsSection = lazy(() =>
  import("@/features/tags/components/manager").then((m) => ({
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
const SecuritySettings = lazy(() =>
  import("@/features/settings/components/sections/security").then((m) => ({
    default: m.SecuritySettings,
  })),
);

export const SECTION_CONFIGS = new Map<string, SectionConfig>([
  ["general", generalSection],
  ["viewer", viewerSection],
  ["appearance", appearanceSection],
  [
    "shortcuts",
    {
      component: ShortcutSettings,
      title: "Hotkeys",
      keywords: ["hotkeys", "keys", "commands", "Eagle"],
      width: "wide",
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
        "Connect the AI providers Agent uses with your keys or a local host you run.",
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
      description: "Choose which models appear in Agent.",
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
      description: "Give Agent context about you and how you like replies.",
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
  [
    "security",
    {
      component: SecuritySettings,
      title: "Security",
      description:
        "Encrypt this Library and control when Pond requires authorization.",
      keywords: ["password", "encryption", "lock", "recovery", "idle", "sleep"],
    },
  ],
  ["backups", backupsSection],
  ["search", searchSection],
  ["processing", processingSection],
  ["harvesting", harvestingSection],
  [
    "mcp",
    {
      ...mcpSection,
      component: McpSection,
    },
  ],
]);
