import { lazy } from "react";
import type { SectionConfig } from "@/components/settings-engine";
import { aiSection } from "@/lib/settings/config-ai";
import { aiModelsSection } from "@/lib/settings/config-ai-models";
import { appearanceSection } from "@/lib/settings/config-appearance";
import { connectionsSection } from "@/lib/settings/config-connections";
import { developerSection } from "@/lib/settings/config-developer";
import { enrichmentSection } from "@/lib/settings/config-enrichment";
import { generalSection } from "@/lib/settings/config-general";
import { imagesSection } from "@/lib/settings/config-images";
import { storageSection } from "@/lib/settings/config-storage";
import { syncSection } from "@/lib/settings/config-sync";
import { trashSection } from "@/lib/settings/config-trash";
import { videosSection } from "@/lib/settings/config-videos";

// Registry of section configs; bespoke sections are lazy so each ships in its own chunk.
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
const AccountSection = lazy(() =>
  import("@/components/settings-account").then((m) => ({
    default: m.AccountSection,
  })),
);

export const SECTION_CONFIGS: Record<string, SectionConfig> = {
  // Bespoke sections render their own page header (Settings.Header) and full
  // layout. Their title/keywords are inert at render time and exist only so the
  // settings search can index them at the section level.
  account: {
    component: AccountSection,
    title: "Account",
    description: "Your Pond's name, icon, and color.",
    keywords: ["profile", "avatar", "icon", "emoji", "color", "name", "rename"],
  },
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
  sync: syncSection,
  videos: videosSection,
  images: imagesSection,
  ai: aiSection,
  "ai-models": aiModelsSection,
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
