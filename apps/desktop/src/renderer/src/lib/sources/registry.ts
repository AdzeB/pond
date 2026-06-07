import { IconFinderOutline18 as LocalIcon } from "@pond/icons/outline/18";
import {
  IconBrandArena,
  IconBrandCosmos,
  IconBrandInstagram,
  IconBrandPinterest,
  IconBrandTikTok,
  IconBrandTwitter,
  IconBrandYoutube,
} from "@pond/icons/social-media";
import {
  DEFAULT_SIDEBAR_SOURCES,
  type SidebarSourceEntry,
  SOURCES,
  type Source,
} from "@pond/schema/db";
import { sourceLabel } from "@pond/schema/sources";
import type React from "react";

type BrandIcon = React.ComponentType<{ width?: number; height?: number }>;

export interface SourceDef {
  source: Source;
  label: string;
  icon: BrandIcon;
}

const SOURCE_ICONS: Record<Source, BrandIcon> = {
  twitter: IconBrandTwitter,
  pinterest: IconBrandPinterest,
  arena: IconBrandArena,
  instagram: IconBrandInstagram,
  cosmos: IconBrandCosmos,
  tiktok: IconBrandTikTok,
  youtube: IconBrandYoutube,
  local: LocalIcon,
};

export function getSourceDef(source: Source): SourceDef {
  return {
    source,
    label: sourceLabel(source),
    icon: SOURCE_ICONS[source],
  };
}

export function defaultSidebarSources(): SidebarSourceEntry[] {
  return DEFAULT_SIDEBAR_SOURCES;
}

export function mergeSidebarSources(
  saved: SidebarSourceEntry[] | undefined,
): SidebarSourceEntry[] {
  if (!saved?.length) return defaultSidebarSources();

  const seen = new Set<Source>();
  const merged: SidebarSourceEntry[] = [];

  for (const entry of saved) {
    if (!SOURCES.includes(entry.source) || seen.has(entry.source)) continue;
    seen.add(entry.source);
    merged.push(entry);
  }

  for (const source of SOURCES) {
    if (!seen.has(source)) {
      merged.push({ source, visibility: "hidden" });
    }
  }

  return merged;
}

export const VISIBILITY_OPTIONS = [
  { value: "always" as const, label: "Always show" },
  { value: "when-count" as const, label: "Show when has saves" },
  { value: "hidden" as const, label: "Don't show" },
];

export function visibilityLabel(
  visibility: SidebarSourceEntry["visibility"],
): string {
  return (
    VISIBILITY_OPTIONS.find((option) => option.value === visibility)?.label ??
    "Always show"
  );
}
