import { lazy } from "react";
import type { SectionConfig } from "@/components/settings-engine";
import { aiSection } from "@/lib/settings/config-ai";
import { appearanceSection } from "@/lib/settings/config-appearance";
import { connectionsSection } from "@/lib/settings/config-connections";
import { developerSection } from "@/lib/settings/config-developer";
import { enrichmentSection } from "@/lib/settings/config-enrichment";
import { generalSection } from "@/lib/settings/config-general";
import { imagesSection } from "@/lib/settings/config-images";
import { storageSection } from "@/lib/settings/config-storage";
import { trashSection } from "@/lib/settings/config-trash";
import { videosSection } from "@/lib/settings/config-videos";

/** Bespoke sections are lazy so each ships in its own chunk. */
const TagsSection = lazy(() =>
  import("@/components/settings-tags").then((m) => ({
    default: m.TagsSection,
  })),
);
const SkillsSection = lazy(() =>
  import("@/components/settings-skills").then((m) => ({
    default: m.SkillsSection,
  })),
);
const AiProvidersSection = lazy(() =>
  import("@/components/settings-ai-providers").then((m) => ({
    default: m.AiProvidersSection,
  })),
);
const FunnelSection = lazy(() =>
  import("@/components/settings-funnel").then((m) => ({
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
    description: "Organize, merge, and archive the tags across your library.",
    keywords: ["labels", "groups", "merge", "archive", "rename", "organize"],
  },
  trash: trashSection,
  storage: storageSection,
  connections: connectionsSection,
  funnel: {
    component: FunnelSection,
    title: "Funnel",
    description:
      "Everything saving this session: progress, failures, and what just landed.",
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
  ai: aiSection,
  /** Nested page reached from AI -> Model; renders its own header with a back button. */
  "ai-providers": {
    component: AiProvidersSection,
    description: "Choose the provider and model that power AI features.",
    keywords: [
      "provider",
      "model",
      "openai",
      "anthropic",
      "ollama",
      "gemini",
      "api key",
      "endpoint",
      "keychain",
    ],
  },
  enrichment: enrichmentSection,
  skills: {
    title: "Skills",
    description:
      "Saved prompts you can run with “/” in the composer. Each one resolves through the “find anything” search.",
    keywords: ["prompts", "commands", "slash", "shortcuts", "automation"],
    component: SkillsSection,
  },
  developer: developerSection,
};
