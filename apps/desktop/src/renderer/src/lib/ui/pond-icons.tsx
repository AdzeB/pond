import {
  IconBookFill18 as Book,
  IconBrainFill18 as Brain,
  IconBrushFill18 as Brush,
  IconCameraFill18 as Camera,
  IconCartShoppingFill18 as Cart,
  IconClapperboardFill18 as Clapperboard,
  IconCode2Fill18 as Code,
  IconCompassFill18 as Compass,
  IconDropletFill18 as Droplet,
  IconFilmFill18 as Film,
  IconFlameFill18 as Flame,
  IconFlaskFill18 as Flask,
  IconFolderFill18 as Folder,
  IconGamepadFill18 as Gamepad,
  IconGlobeFill18 as Globe,
  IconHeadphonesFill18 as Headphones,
  IconHeartFill18 as Heart,
  IconImageFill18 as Image,
  IconLeafFill18 as Leaf,
  IconMapFill18 as MapIcon,
  IconMusicNoteFill18 as Music,
  IconPaletteFill18 as Palette,
  IconRocketFill18 as Rocket,
  IconSparkle3Fill18 as Sparkle,
  IconStarFill18 as Star,
} from "@pond/icons/fill/18";
import type { IconComponent } from "@pond/icons/types";
import { initials } from "@/lib/util/initials";

// Prefix that marks an avatar string as a built-in icon (vs an emoji or initials).
const ICON_PREFIX = "icon:";

export interface PondIcon {
  key: string;
  label: string;
  Icon: IconComponent;
}

// Curated set of icons users can pick for a library avatar.
export const POND_ICONS: readonly PondIcon[] = [
  { key: "clapperboard", label: "Clapperboard", Icon: Clapperboard },
  { key: "film", label: "Film", Icon: Film },
  { key: "camera", label: "Camera", Icon: Camera },
  { key: "image", label: "Image", Icon: Image },
  { key: "palette", label: "Palette", Icon: Palette },
  { key: "brush", label: "Brush", Icon: Brush },
  { key: "music", label: "Music", Icon: Music },
  { key: "headphones", label: "Headphones", Icon: Headphones },
  { key: "gamepad", label: "Gamepad", Icon: Gamepad },
  { key: "book", label: "Book", Icon: Book },
  { key: "folder", label: "Folder", Icon: Folder },
  { key: "code", label: "Code", Icon: Code },
  { key: "globe", label: "Globe", Icon: Globe },
  { key: "compass", label: "Compass", Icon: Compass },
  { key: "map", label: "Map", Icon: MapIcon },
  { key: "rocket", label: "Rocket", Icon: Rocket },
  { key: "brain", label: "Brain", Icon: Brain },
  { key: "flask", label: "Flask", Icon: Flask },
  { key: "leaf", label: "Leaf", Icon: Leaf },
  { key: "flame", label: "Flame", Icon: Flame },
  { key: "droplet", label: "Droplet", Icon: Droplet },
  { key: "cart", label: "Cart", Icon: Cart },
  { key: "star", label: "Star", Icon: Star },
  { key: "heart", label: "Heart", Icon: Heart },
  { key: "sparkle", label: "Sparkle", Icon: Sparkle },
];

const ICON_MAP: ReadonlyMap<string, PondIcon> = new Map(
  POND_ICONS.map((icon) => [icon.key, icon]),
);

// Build the avatar string stored for a chosen icon.
export function iconAvatar(key: string): string {
  return `${ICON_PREFIX}${key}`;
}

// Resolve an avatar string to its icon definition, or null if it isn't an icon.
export function resolvePondIcon(
  avatar: string | null | undefined,
): PondIcon | null {
  if (!avatar?.startsWith(ICON_PREFIX)) return null;
  return ICON_MAP.get(avatar.slice(ICON_PREFIX.length)) ?? null;
}

export function isPondIcon(avatar: string | null | undefined): boolean {
  return resolvePondIcon(avatar) !== null;
}

export type GlyphKind = "icon" | "emoji" | "initials";

export function glyphKind(avatar: string | null | undefined): GlyphKind {
  if (isPondIcon(avatar)) return "icon";
  if (avatar) return "emoji";
  return "initials";
}

// Shared renderer for a pond avatar: a built-in icon, an emoji, or name initials.
export function PondGlyph({
  avatar,
  name,
  iconSize = 20,
}: {
  avatar: string | null | undefined;
  name: string;
  iconSize?: number;
}) {
  const icon = resolvePondIcon(avatar);
  if (icon) {
    const { Icon } = icon;
    return <Icon width={iconSize} height={iconSize} aria-hidden />;
  }
  return <>{avatar ?? initials(name)}</>;
}
