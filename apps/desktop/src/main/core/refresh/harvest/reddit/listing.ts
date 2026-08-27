import type { ListKind, MediaType } from "@pond/schema/db";

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
  mediaUrls?: Array<{ url: string; type?: MediaType; poster?: string }>;
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

export function handleFromMeJson(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const data = (json as { data?: { name?: unknown } }).data;
  const name = data?.name;
  if (typeof name !== "string") return null;
  const handle = name.replace(/^u\//, "").trim();
  if (!handle || handle === "[deleted]" || handle === "me") return null;
  return handle;
}

export function avatarFromMeJson(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const data = asRecord((json as { data?: unknown }).data);
  if (!data) return null;
  const sub = asRecord(data.subreddit);
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

function cleanAvatarUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const url = raw.replace(/&amp;/g, "&").replace(/\\\//g, "/").trim();
  return /^https?:\/\//i.test(url) ? url : null;
}

export function entriesFromListing(json: unknown): {
  entries: ListingEntry[];
  after: string | null;
} {
  const listing = json as {
    error?: unknown;
    data?: { children?: unknown[]; after?: unknown };
  };
  if (listing?.error === 403) return { entries: [], after: null };
  const children = Array.isArray(listing?.data?.children)
    ? listing.data.children
    : [];
  const entries: ListingEntry[] = [];
  for (const child of children) {
    const rec = asRecord(child);
    if (rec?.kind !== "t3") continue;
    const data = asRecord(rec.data);
    if (!data) continue;
    const id = str(data.id);
    if (!id) continue;
    const permalink = str(data.permalink) ?? `/comments/${id}/`;
    const url = permalink.startsWith("http")
      ? permalink
      : `https://www.reddit.com${permalink}`;
    const media = mediaFromPost(data);
    const selftext = str(data.selftext);
    const created = num(data.created_utc);
    const publishedAt = created
      ? new Date(created * 1000).toISOString()
      : undefined;
    const subreddit =
      str(data.subreddit_name_prefixed) ??
      (str(data.subreddit) ? `r/${str(data.subreddit)}` : undefined);
    const likes = num(data.score);
    const comments = num(data.num_comments);
    entries.push({
      sourceId: id,
      url,
      ...(str(data.title) ? { title: str(data.title) } : {}),
      ...(selftext
        ? {
            description:
              selftext.length > 4000 ? `${selftext.slice(0, 4000)}…` : selftext,
          }
        : {}),
      ...(str(data.author) ? { author: str(data.author) } : {}),
      ...(subreddit ? { subreddit } : {}),
      ...media,
      ...(publishedAt ? { publishedAt, savedAt: publishedAt } : {}),
      ...(likes !== undefined ? { likes } : {}),
      ...(comments !== undefined ? { comments } : {}),
    });
  }
  const after = str(listing?.data?.after) ?? null;
  return { entries, after };
}

function mediaFromPost(
  data: Record<string, unknown>,
): Pick<ListingEntry, "mediaUrl" | "mediaUrls" | "mediaType"> {
  const redditVideo =
    asRecord(asRecord(data.media)?.reddit_video) ??
    asRecord(asRecord(data.secure_media)?.reddit_video);
  const videoUrl = str(redditVideo?.fallback_url) ?? str(redditVideo?.dash_url);
  const preview = firstPreviewUrl(data);
  if (data.is_video === true && videoUrl) {
    return {
      mediaUrl: preview ?? videoUrl,
      mediaUrls: [
        {
          url: videoUrl,
          type: "video",
          ...(preview ? { poster: preview } : {}),
        },
      ],
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
  const direct = str(data.url);
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

function firstPreviewUrl(data: Record<string, unknown>): string | undefined {
  const preview = asRecord(data.preview);
  const images = Array.isArray(preview?.images) ? preview.images : [];
  const source = asRecord(asRecord(images[0])?.source);
  return str(source?.url)?.replace(/&amp;/g, "&");
}

function galleryUrls(
  data: Record<string, unknown>,
): Array<{ url: string; type: MediaType }> {
  const meta = asRecord(data.media_metadata);
  if (!meta) return [];
  const out: Array<{ url: string; type: MediaType }> = [];
  for (const value of Object.values(meta)) {
    const rec = asRecord(value);
    const s = asRecord(rec?.s);
    const url = str(s?.u)?.replace(/&amp;/g, "&");
    if (url) out.push({ url, type: "image" });
  }
  return out;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}
