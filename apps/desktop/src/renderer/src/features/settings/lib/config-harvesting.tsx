import { EXTERNAL_SOURCE_IDS, sourceLabel } from "@pond/schema/sources";
import { lazy } from "react";
import type { SectionConfig } from "@/features/settings/components/engine";
import {
  DownloadSources,
  MissingVideos,
} from "@/features/settings/components/sections/download-sources";
import { imageDownloadGroups } from "@/features/settings/lib/config-images";
import { videoDownloadGroups } from "@/features/settings/lib/config-videos";

const ScheduleSection = lazy(() =>
  import("@/features/settings/components/sections/schedule").then((module) => ({
    default: module.ScheduleSection,
  })),
);

export const harvestingSection: SectionConfig = {
  title: "Harvesting",
  description:
    "Choose when Pond fetches updates and how new files are imported.",
  keywords: [
    "downloads",
    "fetch",
    "schedule",
    "sync",
    "images",
    "videos",
    "sources",
    ...EXTERNAL_SOURCE_IDS.map(sourceLabel),
  ],
  groups: [
    { title: "Fetch Schedule", render: () => <ScheduleSection /> },
    ...imageDownloadGroups(),
    ...videoDownloadGroups(),
    { title: "Existing Saves", render: () => <MissingVideos /> },
    { title: "Sources", render: () => <DownloadSources /> },
  ],
};
