import log from "electron-log/main.js";
import { z } from "zod";

const bookmarksEnvelope = z.object({
  data: z.record(z.string(), z.unknown()),
});

let envelopeFailureLogged = false;

export interface BookmarksCapture {
  url: string;
  body: string;
  status?: number;
}

interface RichTweetMedia {
  url: string;
  type: "image" | "video";
  poster?: string;
  width?: number;
  height?: number;
  durationSec?: number;
}

interface RichTweetMetrics {
  likes: number;
  retweets: number;
  replies: number;
  quotes?: number;
  bookmarks?: number;
  views?: number;
}

interface RichTweetCard {
  url?: string;
  domain?: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  large?: boolean;
}

export interface RichTweet {
  tweetId: string;
  url: string;
  bookmarkedAt?: string;
  fullText: string;
  author: { handle: string; name: string; avatarUrl?: string };
  media: RichTweetMedia[];
  metrics: RichTweetMetrics;
  quoted?: RichTweet;
  card?: RichTweetCard;
  raw: unknown;
}

export function parseBookmarksResponses(
  captures: BookmarksCapture[],
): Map<string, RichTweet> {
  const out = new Map<string, RichTweet>();
  for (const cap of captures) {
    let json: unknown;
    try {
      json = JSON.parse(cap.body);
    } catch (err) {
      log.warn("[pond bookmarks] capture body not JSON", cap.url, err);
      continue;
    }
    const env = bookmarksEnvelope.safeParse(json);
    if (!env.success && !envelopeFailureLogged) {
      envelopeFailureLogged = true;
      log.warn(
        "[pond bookmarks] envelope schema drift",
        cap.url,
        env.error.issues.map((i) => i.path.join(".")).join(", "),
      );
    }
    const instructions = pickInstructions(json);
    if (!instructions) continue;
    for (const entry of iterateAddedEntries(instructions)) {
      const tweet = extractEntryTweet(entry);
      if (!tweet) continue;
      out.set(tweet.tweetId, tweet);
    }
  }
  return out;
}

interface InstructionLike {
  type?: string;
  entries?: unknown[];
}

interface EntryLike {
  entryId?: string;
  sortIndex?: string;
  content?: {
    entryType?: string;
    itemContent?: {
      __typename?: string;
      tweet_results?: { result?: unknown };
    };
  };
}

function pickInstructions(json: unknown): InstructionLike[] | null {
  const data = (json as { data?: unknown })?.data;
  if (!data || typeof data !== "object") return null;
  const bookmark = (
    data as {
      bookmark_timeline_v2?: { timeline?: { instructions?: unknown } };
    }
  ).bookmark_timeline_v2?.timeline?.instructions;
  if (Array.isArray(bookmark)) return bookmark as InstructionLike[];
  const user = (
    data as {
      user?: {
        result?: {
          timeline_v2?: { timeline?: { instructions?: unknown } };
          timeline?: { timeline?: { instructions?: unknown } };
        };
      };
    }
  ).user?.result;
  const v2 = user?.timeline_v2?.timeline?.instructions;
  if (Array.isArray(v2)) return v2 as InstructionLike[];
  const v1 = user?.timeline?.timeline?.instructions;
  return Array.isArray(v1) ? (v1 as InstructionLike[]) : null;
}

function* iterateAddedEntries(
  instructions: InstructionLike[],
): Generator<EntryLike> {
  for (const ix of instructions) {
    if (ix.type !== "TimelineAddEntries") continue;
    if (!Array.isArray(ix.entries)) continue;
    for (const entry of ix.entries as EntryLike[]) {
      if (entry.content?.entryType !== "TimelineTimelineItem") continue;
      if (!entry.entryId?.startsWith("tweet-")) continue;
      yield entry;
    }
  }
}

function extractEntryTweet(entry: EntryLike): RichTweet | null {
  const itemContent = entry.content?.itemContent;
  if (itemContent?.__typename !== "TimelineTweet") return null;
  const result = itemContent.tweet_results?.result;
  return resolveTweet(result);
}

function resolveTweet(result: unknown): RichTweet | null {
  const node = result as
    | { __typename?: string; tweet?: unknown; legacy?: unknown }
    | undefined;
  if (!node || typeof node !== "object") return null;

  if (node.__typename === "Tweet") {
    return shapeRichTweet(node);
  }
  if (node.__typename === "TweetWithVisibilityResults") {
    return shapeRichTweet(node.tweet);
  }
  if (
    node.__typename === "TweetTombstone" ||
    node.__typename === "TweetUnavailable"
  ) {
    return null;
  }
  return null;
}

interface TweetLike {
  rest_id?: string;
  legacy?: {
    id_str?: string;
    full_text?: string;
    favorite_count?: number;
    retweet_count?: number;
    reply_count?: number;
    quote_count?: number;
    bookmark_count?: number;
    extended_entities?: { media?: MediaLike[] };
    entities?: { media?: MediaLike[] };
  };
  views?: { count?: string };
  card?: {
    legacy?: {
      name?: string;
      url?: string;
      binding_values?: unknown;
    };
  };
  note_tweet?: {
    note_tweet_results?: { result?: { text?: string } };
  };
  core?: {
    user_results?: {
      result?: {
        core?: { screen_name?: string; name?: string };
        legacy?: {
          screen_name?: string;
          name?: string;
          profile_image_url_https?: string;
        };
        avatar?: { image_url?: string };
      };
    };
  };
  quoted_status_result?: { result?: unknown };
}

interface MediaLike {
  media_url_https?: string;
  url?: string;
  type?: "photo" | "video" | "animated_gif";
  original_info?: { width?: number; height?: number };
  video_info?: {
    duration_millis?: number;
    aspect_ratio?: number[];
    variants?: Array<{ bitrate?: number; url?: string; content_type?: string }>;
  };
}

function shapeRichTweet(raw: unknown): RichTweet | null {
  const tweet = raw as TweetLike | undefined;
  if (!tweet?.legacy?.id_str) return null;
  const tweetId = tweet.legacy.id_str;
  const handle = pickAuthorHandle(tweet);
  const url = handle
    ? `https://x.com/${handle}/status/${tweetId}`
    : `https://x.com/i/status/${tweetId}`;

  const avatarUrl = pickAuthorAvatar(tweet);
  const card = pickCard(tweet);
  return {
    tweetId,
    url,
    fullText: pickFullText(tweet),
    author: {
      handle: handle ?? "",
      name: pickAuthorName(tweet) ?? handle ?? "",
      ...(avatarUrl ? { avatarUrl } : {}),
    },
    media: pickMedia(tweet),
    metrics: pickMetrics(tweet),
    quoted: tweet.quoted_status_result?.result
      ? (resolveTweet(tweet.quoted_status_result.result) ?? undefined)
      : undefined,
    ...(card ? { card } : {}),
    raw: tweet,
  };
}

interface CardBindingValue {
  string_value?: string;
  image_value?: { url?: string; width?: number; height?: number };
}

function cardBindings(raw: unknown): Map<string, CardBindingValue> {
  const map = new Map<string, CardBindingValue>();
  if (Array.isArray(raw)) {
    for (const entry of raw as Array<{
      key?: string;
      value?: CardBindingValue;
    }>) {
      if (entry?.key && entry.value) map.set(entry.key, entry.value);
    }
  } else if (raw && typeof raw === "object") {
    for (const [key, value] of Object.entries(
      raw as Record<string, CardBindingValue>,
    )) {
      if (value) map.set(key, value);
    }
  }
  return map;
}

function pickCardImage(map: Map<string, CardBindingValue>): string | undefined {
  let best: { url: string; score: number } | null = null;
  for (const [key, value] of map) {
    const url = value.image_value?.url;
    if (typeof url !== "string" || url.length === 0) continue;
    if (!/image/i.test(key)) continue;
    let score = value.image_value?.width ?? 0;
    if (/original/i.test(key)) score += 100_000;
    else if (/large/i.test(key)) score += 50_000;
    if (!best || score > best.score) best = { url, score };
  }
  return best?.url;
}

function pickCard(tweet: TweetLike): RichTweetCard | undefined {
  const legacy = tweet.card?.legacy;
  if (!legacy) return undefined;
  const map = cardBindings(legacy.binding_values);
  const str = (k: string): string | undefined => {
    const v = map.get(k)?.string_value;
    return typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;
  };
  const title = str("title");
  const description = str("description");
  const domain = str("vanity_url") ?? str("domain");
  const url =
    str("card_url") ??
    (typeof legacy.url === "string" ? legacy.url : undefined);
  const imageUrl = pickCardImage(map);
  const large = legacy.name === "summary_large_image";

  if (!title && !imageUrl && !url) return undefined;
  return {
    ...(url ? { url } : {}),
    ...(domain ? { domain } : {}),
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(imageUrl ? { imageUrl } : {}),
    ...(large ? { large } : {}),
  };
}

function pickFullText(tweet: TweetLike): string {
  const note = tweet.note_tweet?.note_tweet_results?.result?.text;
  if (note && note.trim().length > 0) return note;
  return tweet.legacy?.full_text ?? "";
}

function pickAuthorHandle(tweet: TweetLike): string | null {
  const core = tweet.core?.user_results?.result?.core?.screen_name;
  if (core) return core;
  const legacy = tweet.core?.user_results?.result?.legacy?.screen_name;
  return legacy ?? null;
}

function pickAuthorName(tweet: TweetLike): string | null {
  const core = tweet.core?.user_results?.result?.core?.name;
  if (core) return core;
  const legacy = tweet.core?.user_results?.result?.legacy?.name;
  return legacy ?? null;
}

function pickAuthorAvatar(tweet: TweetLike): string | null {
  const user = tweet.core?.user_results?.result;
  const raw = user?.avatar?.image_url ?? user?.legacy?.profile_image_url_https;
  if (typeof raw !== "string" || raw.length === 0) return null;
  return raw.replace(/_normal(\.(?:jpg|jpeg|png|webp))/i, "_400x400$1");
}

function pickMedia(tweet: TweetLike): RichTweetMedia[] {
  const list =
    tweet.legacy?.extended_entities?.media ??
    tweet.legacy?.entities?.media ??
    [];
  const out: RichTweetMedia[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    const mapped = mapMedia(item);
    if (!mapped) continue;
    if (seen.has(mapped.url)) continue;
    seen.add(mapped.url);
    out.push(mapped);
  }
  return out;
}

function mapMedia(item: MediaLike): RichTweetMedia | null {
  if (!item.media_url_https) return null;
  const dims = pickDims(item);
  if (item.type === "video" || item.type === "animated_gif") {
    const best = pickBestVariant(item.video_info?.variants);
    const poster = upgradeTwimg(item.media_url_https);
    const ms = item.video_info?.duration_millis;
    return {
      url: best ?? poster,
      type: "video",
      poster,
      ...(dims ?? {}),
      ...(typeof ms === "number" && ms > 0 ? { durationSec: ms / 1000 } : {}),
    };
  }
  return {
    url: upgradeTwimg(item.media_url_https),
    type: "image",
    ...(dims ?? {}),
  };
}

function pickDims(
  item: MediaLike,
): { width: number; height: number } | undefined {
  const w = item.original_info?.width;
  const h = item.original_info?.height;
  if (typeof w === "number" && typeof h === "number" && w > 0 && h > 0) {
    return { width: w, height: h };
  }
  const ar = item.video_info?.aspect_ratio;
  const arW = ar?.[0];
  const arH = ar?.[1];
  if (
    typeof arW === "number" &&
    typeof arH === "number" &&
    arW > 0 &&
    arH > 0
  ) {
    return { width: arW, height: arH };
  }
  return undefined;
}

function pickBestVariant(
  variants: Array<{ bitrate?: number; url?: string }> | undefined,
): string | null {
  if (!Array.isArray(variants) || variants.length === 0) return null;
  let best: { bitrate?: number; url?: string } | null = null;
  for (const v of variants) {
    if (!v.url) continue;
    if (!best || (v.bitrate ?? 0) > (best.bitrate ?? 0)) best = v;
  }
  return best?.url ?? null;
}

function upgradeTwimg(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname === "pbs.twimg.com") {
      u.searchParams.set("name", "orig");
      return u.toString();
    }
  } catch {}
  return url;
}

function pickMetrics(tweet: TweetLike): RichTweetMetrics {
  const legacy = tweet.legacy ?? {};
  const views = tweet.views?.count;
  return {
    likes: legacy.favorite_count ?? 0,
    retweets: legacy.retweet_count ?? 0,
    replies: legacy.reply_count ?? 0,
    quotes: legacy.quote_count,
    bookmarks: legacy.bookmark_count,
    views: views ? Number.parseInt(views, 10) || undefined : undefined,
  };
}
