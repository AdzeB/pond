import type { JsonObject, JsonValue } from "@pond/schema/json";
import type {
  Capture,
  CaptureExtras,
  CaptureMedia,
  CaptureMetrics,
} from "@pond/schema/raw";
import log from "electron-log/main.js";
import { z } from "zod";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 " +
  "(KHTML, like Gecko) Version/17.0 Safari/605.1.15 PondBot/0.1";
const FETCH_TIMEOUT_MS = 15_000;

const OptionalText = z.string().optional().catch(undefined);
const OptionalCount = z.number().optional().catch(undefined);

const RelayUserSchema = z
  .object({
    fullName: OptionalText,
    username: OptionalText,
    profileUrl: OptionalText,
    imageLargeUrl: OptionalText,
    imageMediumUrl: OptionalText,
    imageSmallUrl: OptionalText,
  })
  .optional()
  .catch(undefined);

type RelayUser = NonNullable<z.infer<typeof RelayUserSchema>>;

const RelayImageSchema = z
  .object({ url: OptionalText, width: OptionalCount, height: OptionalCount })
  .optional()
  .catch(undefined);

const RelayPinSchema = z
  .object({
    title: OptionalText,
    closeupUnifiedTitle: OptionalText,
    description: OptionalText,
    closeupUnifiedDescription: OptionalText,
    seoTitle: OptionalText,
    dominantColor: OptionalText,
    imageLargeUrl: OptionalText,
    createdAt: OptionalText,
    repinCount: OptionalCount,
    totalReactionCount: OptionalCount,
    shareCount: OptionalCount,
    isVideo: z.boolean().optional().catch(undefined),
    link: OptionalText,
    mobileLink: OptionalText,
    closeupAttribution: RelayUserSchema,
    closeupUnifiedAttribution: RelayUserSchema,
    nativeCreator: RelayUserSchema,
    originPinner: RelayUserSchema,
    board: z.object({ url: OptionalText }).optional().catch(undefined),
    images_orig: RelayImageSchema,
    images_736x: RelayImageSchema,
    images_564x: RelayImageSchema,
    images_474x: RelayImageSchema,
    aggregatedPinData: z
      .object({
        aggregatedStats: z
          .object({ saves: OptionalCount })
          .optional()
          .catch(undefined),
        commentCount: OptionalCount,
      })
      .optional()
      .catch(undefined),
  })
  .catch({});

type RelayPin = z.infer<typeof RelayPinSchema>;

const JsonObjectSchema = z.custom<JsonObject>(
  (value) => value instanceof Object && !Array.isArray(value),
);

const RelayEnvelopeSchema = z
  .object({
    data: z
      .object({
        v3GetPinQueryv2: z
          .object({ data: JsonObjectSchema.optional().catch(undefined) })
          .optional()
          .catch(undefined),
      })
      .optional()
      .catch(undefined),
  })
  .catch({});

type PinterestCaptureResult =
  | { ok: true; capture: Capture }
  | {
      ok: false;
      reason: "fetch_failed" | "blocked" | "no_pin";
      status?: number;
    };

export async function fetchPinterestCapture({
  sourceId,
}: {
  sourceId: string;
}): Promise<PinterestCaptureResult> {
  const url = `https://www.pinterest.com/pin/${sourceId}/`;
  let res: Response;
  try {
    res = await fetch(url, {
      redirect: "follow",
      headers: {
        "user-agent": USER_AGENT,
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (err) {
    log.warn("[pond refresh:pinterest-api] fetch failed", url, err);
    return { ok: false, reason: "fetch_failed" };
  }
  if (!res.ok) {
    return {
      ok: false,
      reason:
        res.status === 401 || res.status === 403 ? "blocked" : "fetch_failed",
      status: res.status,
    };
  }
  const html = await res.text();
  const pin = extractPin(html);
  if (!pin) return { ok: false, reason: "no_pin" };
  return { ok: true, capture: buildCapture(sourceId, url, pin) };
}

function extractPin(html: string): RelayPin | null {
  const candidates: JsonObject[] = [];
  const callOpen = "__PWS_RELAY_REGISTER_COMPLETED_REQUEST__(";
  let cursor = 0;
  while (true) {
    const idx = html.indexOf(callOpen, cursor);
    if (idx < 0) break;
    const argStart = idx + callOpen.length;
    const callEnd = findCallEnd(html, argStart);
    if (callEnd < 0) break;
    const inner = html.slice(argStart, callEnd);
    const secondArgOffset = findSecondArgStart(inner);
    if (secondArgOffset >= 0) {
      const jsonStr = inner.slice(secondArgOffset).replace(/[\s,]+$/, "");
      try {
        const envelope = RelayEnvelopeSchema.parse(JSON.parse(jsonStr));
        const candidate = envelope.data?.v3GetPinQueryv2?.data;
        if (candidate) candidates.push(candidate);
      } catch {}
    }
    cursor = callEnd + 1;
  }
  if (candidates.length === 0) return null;
  return RelayPinSchema.parse(mergePins(candidates));
}

function mergePins(pins: JsonObject[]): JsonObject {
  const out: JsonObject = {};
  const keys = new Set<string>();
  for (const p of pins) {
    for (const k of Object.keys(p)) keys.add(k);
  }
  for (const key of keys) {
    let best: JsonValue | undefined;
    let bestScore = -1;
    for (const p of pins) {
      const v = p[key];
      if (v == null) continue;
      const score =
        v instanceof Object && !Array.isArray(v) ? Object.keys(v).length : 1;
      if (score > bestScore) {
        best = v;
        bestScore = score;
      }
    }
    if (best !== undefined) out[key] = best;
  }
  return out;
}

function findCallEnd(s: string, start: number): number {
  let depthParen = 1;
  let _depthBrace = 0;
  let inStr = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (c === "\\") {
        i += 1;
        continue;
      }
      if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{") _depthBrace += 1;
    else if (c === "}") _depthBrace -= 1;
    else if (c === "(") depthParen += 1;
    else if (c === ")") {
      depthParen -= 1;
      if (depthParen === 0) return i;
    }
  }
  return -1;
}

function findSecondArgStart(inner: string): number {
  let depthParen = 0;
  let depthBrace = 0;
  let inStr = false;
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    if (inStr) {
      if (c === "\\") {
        i += 1;
        continue;
      }
      if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "(") depthParen += 1;
    else if (c === ")") depthParen -= 1;
    else if (c === "{") {
      if (depthParen === 0 && depthBrace === 0) return i;
      depthBrace += 1;
    } else if (c === "}") depthBrace -= 1;
  }
  return -1;
}

function buildCapture(sourceId: string, url: string, pin: RelayPin): Capture {
  const title = pickStr([
    pin.title,
    pin.closeupUnifiedTitle,
    cleanSeoTitle(pin.seoTitle),
  ]);
  const description = pickDescription(pin);

  const creator = pickCreator(pin);
  const author = ((): Capture["author"] => {
    if (!creator) return undefined;
    const name = creator.fullName ?? undefined;
    const handle = creator.username ?? undefined;
    const avatarUrl =
      pickStr([
        creator.imageLargeUrl,
        creator.imageMediumUrl,
        creator.imageSmallUrl,
      ]) ?? undefined;
    const profileUrl =
      creator.profileUrl ??
      (creator.username
        ? `https://www.pinterest.com/${creator.username}/`
        : undefined);
    const out: NonNullable<Capture["author"]> = {};
    if (name) out.name = name;
    if (handle) out.handle = handle;
    if (avatarUrl) out.avatarUrl = avatarUrl;
    if (profileUrl) out.profileUrl = profileUrl;
    return Object.keys(out).length > 0 ? out : undefined;
  })();

  const media = ((): CaptureMedia[] => {
    const primary = pickStr([pin.images_orig?.url, pin.imageLargeUrl]);
    if (!primary) return [];
    const dims = pin.images_736x ?? pin.images_564x ?? pin.images_474x;
    const entry: CaptureMedia = {
      url: primary,
      type: pin.isVideo ? "video" : "image",
    };
    if (dims?.width !== undefined) entry.width = dims.width;
    if (dims?.height !== undefined) entry.height = dims.height;
    return [entry];
  })();

  const metrics = ((): CaptureMetrics | undefined => {
    const out: CaptureMetrics = {};
    const aggregated = pin.aggregatedPinData;
    if (pin.totalReactionCount !== undefined) {
      out.reactions = pin.totalReactionCount;
    }
    if (aggregated?.commentCount !== undefined) {
      out.comments = aggregated.commentCount;
    }
    if (aggregated?.aggregatedStats?.saves !== undefined) {
      out.saves = aggregated.aggregatedStats.saves;
    }
    if (pin.repinCount !== undefined) out.repins = pin.repinCount;
    if (pin.shareCount !== undefined) out.shares = pin.shareCount;
    return Object.keys(out).length > 0 ? out : undefined;
  })();

  const extras = ((): CaptureExtras | undefined => {
    const out: CaptureExtras = {};
    const externalLink = pickStr([pin.link, pin.mobileLink]);
    if (externalLink) out.externalLink = externalLink;
    if (pin.dominantColor) out.dominantColor = pin.dominantColor;
    if (pin.board?.url) {
      const boardUrl = pin.board.url.startsWith("http")
        ? pin.board.url
        : `https://www.pinterest.com${pin.board.url}`;
      const slug = pin.board.url.replace(/\/+$/, "").split("/").pop();
      const boardName = slug
        ? decodeURIComponent(slug).replace(/-/g, " ")
        : undefined;
      out.board = { name: boardName, url: boardUrl };
    }
    return Object.keys(out).length > 0 ? out : undefined;
  })();

  const publishedAt = parsePinterestDate(pin.createdAt);

  const capture: Capture = {
    id: sourceId,
    source: "pinterest",
    url,
    media,
  };
  if (title) capture.title = title;
  if (description) capture.description = description;
  if (author) capture.author = author;
  if (publishedAt) capture.publishedAt = publishedAt;
  if (metrics) capture.metrics = metrics;
  if (extras) capture.extras = extras;
  return capture;
}

function parsePinterestDate(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

function pickCreator(pin: RelayPin): RelayUser | null {
  const candidates: Array<RelayUser | undefined> = [
    pin.nativeCreator,
    pin.closeupUnifiedAttribution,
    pin.originPinner,
    pin.closeupAttribution,
  ];
  let best: RelayUser | null = null;
  let bestScore = -1;
  for (const c of candidates) {
    if (!c) continue;
    const score =
      (c.fullName ? 2 : 0) +
      (c.imageLargeUrl ? 3 : c.imageMediumUrl ? 2 : c.imageSmallUrl ? 1 : 0) +
      (c.username ? 1 : 0);
    if (score > bestScore) {
      best = c;
      bestScore = score;
    }
  }
  return best;
}

function cleanSeoTitle(seoTitle: string | undefined): string | null {
  if (!seoTitle) return null;
  const head = seoTitle.split(/\s+\|\s+/)[0]?.trim();
  return head && head.length >= 3 ? head : seoTitle;
}

function pickDescription(pin: RelayPin): string | null {
  for (const c of [pin.description, pin.closeupUnifiedDescription]) {
    const t = (c ?? "").trim();
    if (t.length >= 3) return t;
  }
  return null;
}

function pickStr(values: Array<string | undefined | null>): string | null {
  for (const v of values) {
    if (v?.trim()) return v.trim();
  }
  return null;
}
