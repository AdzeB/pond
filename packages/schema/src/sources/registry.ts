import type { SourceDescriptor } from "./types";

// Source of truth for cross-runtime source facts. Add an entry (or run
// `pnpm new-source <id>`); the `Source` union then widens automatically.
export const SOURCE_DESCRIPTORS = [
  {
    id: "twitter",
    label: "Twitter",
    hosts: ["x.com", "twitter.com"],
    urlPatterns: [
      /^https?:\/\/(?:www\.)?(?:x|twitter)\.com\/[^/]+\/status\/(\d+)/i,
      /^https?:\/\/(?:www\.)?(?:x|twitter)\.com\/i\/web\/status\/(\d+)/i,
    ],
  },
  {
    id: "instagram",
    label: "Instagram",
    hosts: ["instagram.com"],
    urlPatterns: [
      /^https?:\/\/(?:www\.)?instagram\.com\/(?:p|reels?|tv)\/([A-Za-z0-9_-]+)/i,
    ],
  },
  {
    id: "pinterest",
    label: "Pinterest",
    hosts: ["pinterest.com", "pin.it"],
    urlPatterns: [
      /^https?:\/\/(?:[a-z]+\.)?pinterest\.[a-z.]+\/pin\/(\d+)/i,
      /^https?:\/\/pin\.it\/[A-Za-z0-9]+/i,
    ],
  },
  {
    id: "arena",
    label: "Are.na",
    hosts: ["are.na"],
    urlPatterns: [
      /^https?:\/\/(?:www\.)?are\.na\/block\/(\d+)/i,
      /^https?:\/\/(?:www\.)?are\.na\/[^/]+\/[^/]+-(\d+)/i,
    ],
  },
  {
    id: "cosmos",
    label: "Cosmos",
    hosts: ["cosmos.so"],
    urlPatterns: [/^https?:\/\/(?:www\.)?cosmos\.so\/[^/]+\/?/i],
  },
  {
    id: "tiktok",
    label: "TikTok",
    hosts: ["tiktok.com"],
    urlPatterns: [
      /^https?:\/\/(?:[a-z]+\.)?tiktok\.com\/[^/]+\/video\/(\d+)/i,
      /^https?:\/\/(?:vm|vt)\.tiktok\.com\/[A-Za-z0-9]+/i,
    ],
  },
  {
    id: "youtube",
    label: "YouTube",
    hosts: ["youtube.com", "youtu.be"],
    urlPatterns: [
      /^https?:\/\/(?:www\.|m\.)?youtube\.com\/watch\?[^#]*v=([A-Za-z0-9_-]+)/i,
      /^https?:\/\/(?:www\.|m\.)?youtube\.com\/shorts\/([A-Za-z0-9_-]+)/i,
      /^https?:\/\/youtu\.be\/([A-Za-z0-9_-]+)/i,
    ],
  },
] as const satisfies readonly SourceDescriptor[];

/** The id of an external (non-`local`) source. */
export type ExternalSource = (typeof SOURCE_DESCRIPTORS)[number]["id"];

/** External source ids, in canonical order. */
export const EXTERNAL_SOURCE_IDS: readonly ExternalSource[] =
  SOURCE_DESCRIPTORS.map((d) => d.id);

const BY_ID = new Map<string, SourceDescriptor>(
  SOURCE_DESCRIPTORS.map((d) => [d.id, d]),
);

/** Look up the descriptor for an external source. Throws on unknown ids. */
export function descriptorFor(id: ExternalSource): SourceDescriptor {
  const descriptor = BY_ID.get(id);
  if (!descriptor) throw new Error(`no source descriptor for "${id}"`);
  return descriptor;
}
