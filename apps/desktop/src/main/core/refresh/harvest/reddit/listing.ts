import type { ListKind, MediaType } from "@pond/schema/db";
import { z } from "zod";

export interface ListingMedia {
  url: string;
  type?: MediaType;
  poster?: string;
}

export interface ListingEntry {
  sourceId: string;
  url: string;
  savedAt?: string;
  publishedAt?: string;
  title?: string;
  description?: string;
  author?: string;
  subreddit?: string;
  likes?: number;
  comments?: number;
  mediaUrl?: string;
  mediaUrls?: ListingMedia[];
  mediaType?: MediaType;
  listKinds?: ListKind[];
}

export type RedditListingKind = "saved" | "upvoted";

export function redditListingUrl(
  handle: string,
  kind: RedditListingKind,
  after: string | null,
): string {
  const params = new URLSearchParams({
    limit: "100",
    raw_json: "1",
    type: "links",
  });
  if (after) params.set("after", after);
  return `https://www.reddit.com/user/${encodeURIComponent(handle)}/${kind}.json?${params}`;
}

export interface ListingPage {
  entries: ListingEntry[];
  after: string | null;
}

const OptionalText = z.string().min(1).optional().catch(undefined);
const OptionalNumber = z
  .number()
  .refine(Number.isFinite)
  .optional()
  .catch(undefined);

export const RedditAccountSchema = z
  .object({
    kind: OptionalText,
    data: z
      .object({
        name: OptionalText,
        icon_img: OptionalText,
        snoovatar_img: OptionalText,
        subreddit: z
          .object({ icon_img: OptionalText, community_icon: OptionalText })
          .optional()
          .catch(undefined),
      })
      .optional()
      .catch(undefined),
  })
  .catch({});

export type RedditAccount = z.infer<typeof RedditAccountSchema>;

const RedditVideoSchema = z
  .object({
    reddit_video: z
      .object({ fallback_url: OptionalText, dash_url: OptionalText })
      .optional()
      .catch(undefined),
  })
  .optional()
  .catch(undefined);

const RedditPostSchema = z.object({
  id: OptionalText,
  permalink: OptionalText,
  title: OptionalText,
  selftext: OptionalText,
  author: OptionalText,
  subreddit: OptionalText,
  subreddit_name_prefixed: OptionalText,
  created_utc: OptionalNumber,
  score: OptionalNumber,
  num_comments: OptionalNumber,
  url: OptionalText,
  is_video: z.boolean().optional().catch(undefined),
  media: RedditVideoSchema,
  secure_media: RedditVideoSchema,
  preview: z
    .object({
      images: z
        .array(
          z
            .object({
              source: z
                .object({ url: OptionalText })
                .optional()
                .catch(undefined),
            })
            .catch({}),
        )
        .optional()
        .catch(undefined),
    })
    .optional()
    .catch(undefined),
  media_metadata: z
    .record(
      z.string(),
      z
        .object({
          s: z.object({ u: OptionalText }).optional().catch(undefined),
        })
        .catch({}),
    )
    .optional()
    .catch(undefined),
});

type RedditPost = z.infer<typeof RedditPostSchema>;

export const RedditListingSchema = z
  .object({
    error: OptionalNumber,
    data: z
      .object({
        after: OptionalText,
        children: z
          .array(
            z
              .object({
                kind: OptionalText,
                data: RedditPostSchema.optional().catch(undefined),
              })
              .catch({}),
          )
          .optional()
          .catch(undefined),
      })
      .optional()
      .catch(undefined),
  })
  .catch({});

export type RedditListing = z.infer<typeof RedditListingSchema>;

export const RedditPostResponseSchema = z.union([
  z.array(RedditListingSchema),
  RedditListingSchema,
]);

export function handleFromMeJson(account: RedditAccount): string | null {
  const name = account.data?.name;
  if (name === undefined) return null;
  const handle = name.replace(/^u\//, "").trim();
  if (!handle || handle === "[deleted]" || handle === "me") return null;
  return handle;
}

export function avatarFromMeJson(account: RedditAccount): string | null {
  const data = account.data;
  if (!data) return null;
  const sub = data.subreddit;
  for (const raw of [
    data.icon_img,
    data.snoovatar_img,
    sub?.icon_img,
    sub?.community_icon,
  ]) {
    const url = cleanAvatarUrl(raw);
    if (url) return url;
  }
  return null;
}

function cleanAvatarUrl(raw: string | undefined): string | null {
  if (raw === undefined) return null;
  const url = raw.replace(/&amp;/g, "&").replace(/\\\//g, "/").trim();
  return /^https?:\/\//i.test(url) ? url : null;
}

export function entriesFromListing(listing: RedditListing): ListingPage {
  if (listing.error === 403) return { entries: [], after: null };
  const children = listing.data?.children ?? [];
  const entries: ListingEntry[] = [];
  for (const child of children) {
    if (child.kind !== "t3") continue;
    const data = child.data;
    if (!data) continue;
    const id = data.id;
    if (!id) continue;
    const permalink = data.permalink ?? `/comments/${id}/`;
    const url = permalink.startsWith("http")
      ? permalink
      : `https://www.reddit.com${permalink}`;
    const selftext = data.selftext;
    const publishedAt = data.created_utc
      ? new Date(data.created_utc * 1000).toISOString()
      : undefined;
    const subreddit =
      data.subreddit_name_prefixed ??
      (data.subreddit ? `r/${data.subreddit}` : undefined);
    const entry: ListingEntry = { sourceId: id, url };
    if (data.title) entry.title = data.title;
    if (selftext) {
      entry.description =
        selftext.length > 4000 ? `${selftext.slice(0, 4000)}…` : selftext;
    }
    if (data.author) entry.author = data.author;
    if (subreddit) entry.subreddit = subreddit;
    Object.assign(entry, mediaFromPost(data));
    if (publishedAt) {
      entry.publishedAt = publishedAt;
      entry.savedAt = publishedAt;
    }
    if (data.score !== undefined) entry.likes = data.score;
    if (data.num_comments !== undefined) entry.comments = data.num_comments;
    entries.push(entry);
  }
  const after = listing.data?.after ?? null;
  return { entries, after };
}

function mediaFromPost(
  data: RedditPost,
): Pick<ListingEntry, "mediaUrl" | "mediaUrls" | "mediaType"> {
  const redditVideo =
    data.media?.reddit_video ?? data.secure_media?.reddit_video;
  const videoUrl = redditVideo?.fallback_url ?? redditVideo?.dash_url;
  const preview = firstPreviewUrl(data);
  if (data.is_video === true && videoUrl) {
    const video: ListingMedia = { url: videoUrl, type: "video" };
    if (preview) video.poster = preview;
    return {
      mediaUrl: preview ?? videoUrl,
      mediaUrls: [video],
      mediaType: "video",
    };
  }
  const gallery = galleryUrls(data);
  if (gallery.length > 0) {
    return {
      mediaUrl: gallery[0]?.url,
      mediaUrls: gallery,
      mediaType: "image",
    };
  }
  const direct = data.url;
  if (direct && /\.(jpe?g|png|gif|webp)(\?|$)/i.test(direct)) {
    return {
      mediaUrl: direct,
      mediaUrls: [{ url: direct, type: "image" }],
      mediaType: "image",
    };
  }
  if (preview) {
    return {
      mediaUrl: preview,
      mediaUrls: [{ url: preview, type: "image" }],
      mediaType: "image",
    };
  }
  return {};
}

function firstPreviewUrl(data: RedditPost): string | undefined {
  const source = data.preview?.images?.[0]?.source;
  return source?.url?.replace(/&amp;/g, "&");
}

function galleryUrls(data: RedditPost): ListingMedia[] {
  const meta = data.media_metadata;
  if (!meta) return [];
  const out: ListingMedia[] = [];
  for (const value of Object.values(meta)) {
    const url = value.s?.u?.replace(/&amp;/g, "&");
    if (url) out.push({ url, type: "image" });
  }
  return out;
}
