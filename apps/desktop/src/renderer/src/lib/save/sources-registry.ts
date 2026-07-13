import {
  IconFolderFill18 as LocalIcon,
  IconEarthFill18 as WebIcon,
} from "@pond/icons/fill/18";
import {
  IconBrandArena,
  IconBrandCosmos,
  IconBrandInstagram,
  IconBrandPinterest,
  IconBrandReddit,
  IconBrandThreads,
  IconBrandTikTok,
  IconBrandTwitter,
  IconBrandYoutube,
} from "@pond/icons/social-media";
import type { Source } from "@pond/schema/db";
import { isSource, sourceLabel } from "@pond/schema/sources";
import type React from "react";

type BrandIcon = React.ComponentType<{ width?: number; height?: number }>;

interface SourceDef {
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
  reddit: IconBrandReddit,
  threads: IconBrandThreads,
  web: WebIcon,
  local: LocalIcon,
};

export function getSourceDef(source: Source): SourceDef {
  return {
    source,
    label: sourceLabel(source),
    icon: SOURCE_ICONS[source],
  };
}

const SOURCE_ALIASES: Record<string, Source> = {
  x: "twitter",
  "are.na": "arena",
};

/** Null for unknown sources; callers fall back to a text label. */
export function getSourceIcon(source: string): BrandIcon | null {
  const key = source.toLowerCase();
  const normalized = SOURCE_ALIASES[key] ?? key;
  if (isSource(normalized)) return SOURCE_ICONS[normalized];
  return null;
}
