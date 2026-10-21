import { EXTERNAL_SOURCE_IDS, sourceLabel } from "@pond/schema/sources";
import { lazy } from "react";
import type { SectionConfig } from "@/features/settings/components/engine";
import { DownloadSources } from "@/features/settings/components/sections/download-sources";

const ScheduleSection = lazy(() =>
  import("@/features/settings/components/sections/schedule").then((module) => ({
    default: module.ScheduleSection,
  })),
);

export const scheduleSection: SectionConfig = {
  title: "Schedule",
  description: "Choose when Pond fetches updates from your sources.",
  keywords: ["harvesting", "fetch", "schedule", "sync", "interval"],
  groups: [{ title: "Fetch Schedule", render: () => <ScheduleSection /> }],
};

export const sourcesSection: SectionConfig = {
  title: "Sources",
  description: "Give a source its own image and video download settings.",
  keywords: [
    "harvesting",
    "downloads",
    "overrides",
    ...EXTERNAL_SOURCE_IDS.map(sourceLabel),
  ],
  groups: [{ render: () => <DownloadSources /> }],
};
