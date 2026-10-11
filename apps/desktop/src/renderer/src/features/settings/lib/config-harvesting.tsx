import { lazy } from "react";
import type { SectionConfig } from "@/features/settings/components/engine";
import { imagesSection } from "@/features/settings/lib/config-images";
import { videosSection } from "@/features/settings/lib/config-videos";

const ScheduleSection = lazy(() =>
  import("@/features/settings/components/sections/schedule").then((module) => ({
    default: module.ScheduleSection,
  })),
);

export const harvestingSection: SectionConfig = {
  ...videosSection,
  title: "Harvesting",
  description:
    "Choose when Pond fetches updates and how new files are imported.",
  keywords: ["downloads", "fetch", "schedule", "sync", "images", "videos"],
  groups: [
    { title: "Fetch Schedule", render: () => <ScheduleSection /> },
    ...(imagesSection.groups ?? []).map((group) => ({
      ...group,
      title: group.title === "Format" ? "Images" : "Image Encoding",
    })),
    ...(videosSection.groups ?? []).map((group) => ({
      ...group,
      title: `Video ${group.title}`,
    })),
  ],
};
