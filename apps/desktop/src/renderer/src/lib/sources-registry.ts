import { IconFolderFill18 as LocalIcon } from "@pond/icons/fill/18";
import {
  IconBrandArena,
  IconBrandCosmos,
  IconBrandInstagram,
  IconBrandPinterest,
  IconBrandReddit,
  IconBrandTikTok,
  IconBrandTwitter,
  IconBrandYoutube,
} from "@pond/icons/social-media";
import type { Source } from "@pond/schema/db";
import { isSource, sourceLabel } from "@pond/schema/sources";
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
  reddit: IconBrandReddit,
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

// Resolve a brand icon from a loosely-typed `save.source`; null for unknown sources (callers use a text label).
export function getSourceIcon(source: string): BrandIcon | null {
  const key = source.toLowerCase();
  const normalized = SOURCE_ALIASES[key] ?? key;
  if (isSource(normalized)) return SOURCE_ICONS[normalized];
  return null;
}
