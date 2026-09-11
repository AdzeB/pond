import {
  IconFolderFill18 as LocalIcon,
  IconEarthFill18 as WebIcon,
} from "@pond/icons/fill/18";
import {
  IconBrandArena,
  IconBrandCosmos,
  IconBrandThreads,
  IconInstagram,
  IconPinterest,
  IconTikTok,
  IconXTwitter,
  IconYoutube,
} from "@pond/icons/social-media";
import type { IconComponent } from "@pond/icons/types";
import type { Source } from "@pond/schema/db";
import { resolveSourceId, sourceLabel } from "@pond/schema/sources";
import redditLogo from "@/assets/logos/reddit.png";

interface SourceDef {
  source: Source;
  label: string;
  logo: string | null;
  icon: IconComponent | null;
}

const SOURCE_LOGOS = {
  twitter: null,
  pinterest: null,
  arena: null,
  instagram: null,
  cosmos: null,
  tiktok: null,
  youtube: null,
  reddit: redditLogo,
  threads: null,
  web: null,
  local: null,
} satisfies Record<Source, string | null>;

const SOURCE_ICONS = {
  twitter: IconXTwitter,
  pinterest: IconPinterest,
  arena: IconBrandArena,
  instagram: IconInstagram,
  cosmos: IconBrandCosmos,
  tiktok: IconTikTok,
  youtube: IconYoutube,
  reddit: null,
  threads: IconBrandThreads,
  web: WebIcon,
  local: LocalIcon,
} satisfies Record<Source, IconComponent | null>;

export function getSourceDef(source: Source): SourceDef {
  return {
    source,
    label: sourceLabel(source),
    logo: SOURCE_LOGOS[source],
    icon: SOURCE_ICONS[source],
  };
}

export function getSourceLogo(source: string): string | null {
  const normalized = resolveSourceId(source);
  return normalized ? SOURCE_LOGOS[normalized] : null;
}

export function getSourceIcon(source: string): IconComponent | null {
  const normalized = resolveSourceId(source);
  return normalized ? SOURCE_ICONS[normalized] : null;
}
