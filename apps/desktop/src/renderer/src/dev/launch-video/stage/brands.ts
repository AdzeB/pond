import {
  IconBrandArena,
  IconBrandCosmos,
  IconBrandThreads,
  IconInstagram,
  IconPinterest,
  IconReddit,
  IconTikTok,
  IconXTwitter,
  IconYoutube,
} from "@pond/icons/social-media";

export const BRANDS = [
  { id: "x", name: "X", Icon: IconXTwitter },
  { id: "instagram", name: "Instagram", Icon: IconInstagram },
  { id: "pinterest", name: "Pinterest", Icon: IconPinterest },
  { id: "arena", name: "Are.na", Icon: IconBrandArena },
  { id: "cosmos", name: "Cosmos", Icon: IconBrandCosmos },
  { id: "tiktok", name: "TikTok", Icon: IconTikTok },
  { id: "youtube", name: "YouTube", Icon: IconYoutube },
  { id: "reddit", name: "Reddit", Icon: IconReddit },
  { id: "threads", name: "Threads", Icon: IconBrandThreads },
] as const;

export type Brand = (typeof BRANDS)[number];

export const brand = (id: string): Brand =>
  BRANDS.find((entry) => entry.id === id) ?? BRANDS[0];
