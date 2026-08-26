import {
  IconFolderFill18 as LocalIcon,
  IconEarthFill18 as WebIcon,
} from "@pond/icons/fill/18";
import type { Source } from "@pond/schema/db";
import { resolveSourceId, sourceLabel } from "@pond/schema/sources";
import type React from "react";
import arenaLogo from "@/assets/logos/arena.png";
import cosmosLogo from "@/assets/logos/cosmos.png";
import instagramLogo from "@/assets/logos/instagram.png";
import pinterestLogo from "@/assets/logos/pinterest.png";
import redditLogo from "@/assets/logos/reddit.png";
import threadsLogo from "@/assets/logos/threads.png";
import tiktokLogo from "@/assets/logos/tiktok.png";
import twitterLogo from "@/assets/logos/twitter.png";
import youtubeLogo from "@/assets/logos/youtube.png";

type GlyphIcon = React.ComponentType<{ width?: number; height?: number }>;

interface SourceDef {
  source: Source;
  label: string;
  logo: string | null;
  icon: GlyphIcon | null;
}

const SOURCE_LOGOS: Record<Source, string | null> = {
  twitter: twitterLogo,
  pinterest: pinterestLogo,
  arena: arenaLogo,
  instagram: instagramLogo,
  cosmos: cosmosLogo,
  tiktok: tiktokLogo,
  youtube: youtubeLogo,
  reddit: redditLogo,
  threads: threadsLogo,
  web: null,
  local: null,
};

const GLYPH_ICONS: Partial<Record<Source, GlyphIcon>> = {
  web: WebIcon,
  local: LocalIcon,
};

export function getSourceDef(source: Source): SourceDef {
  return {
    source,
    label: sourceLabel(source),
    logo: SOURCE_LOGOS[source],
    icon: GLYPH_ICONS[source] ?? null,
  };
}

export function getSourceLogo(source: string): string | null {
  const normalized = resolveSourceId(source);
  return normalized ? SOURCE_LOGOS[normalized] : null;
}

export function getSourceIcon(source: string): GlyphIcon | null {
  const normalized = resolveSourceId(source);
  return normalized ? (GLYPH_ICONS[normalized] ?? null) : null;
}
