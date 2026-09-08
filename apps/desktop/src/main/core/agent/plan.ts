import {
  MEDIA_TYPES,
  type MediaType,
  SOURCES,
  type Source,
} from "@pond/schema/db";
import { z } from "zod";

export const assistantPlan = z.object({
  intent: z.enum(["chat", "search", "recent", "attachments", "clarify"]),
  query: z.string().max(150),
  media: z.array(z.enum(MEDIA_TYPES)).max(MEDIA_TYPES.length),
  source: z.enum(SOURCES).optional(),
  requiresEvidence: z.boolean(),
  directLookup: z.boolean(),
  requestedCount: z.number().int().min(1).max(24).optional(),
  edit: z.boolean(),
});

export type AssistantPlan = z.infer<typeof assistantPlan>;

interface PlanInput {
  latest: string;
  hasSearch: boolean;
  attachmentCount?: number;
}

const MEDIA_WORDS: ReadonlyArray<{
  pattern: RegExp;
  media: MediaType;
}> = [
  { pattern: /\b(?:pics?|pictures?|photos?|images?)\b/gi, media: "image" },
  { pattern: /\b(?:vids?|videos?)\b/gi, media: "video" },
  { pattern: /\b(?:articles?|links?|webpages?)\b/gi, media: "link" },
  { pattern: /\b(?:notes?|text(?:s)?)\b/gi, media: "text" },
];

const SOURCE_WORDS: ReadonlyArray<{
  pattern: RegExp;
  source: Source;
}> = [
  { pattern: /\b(?:tweets?|twitter)\b/gi, source: "twitter" },
  { pattern: /\b(?:instagram|insta|ig|reels?)\b/gi, source: "instagram" },
  { pattern: /\b(?:youtube|yt)\b/gi, source: "youtube" },
  { pattern: /\btiktoks?\b/gi, source: "tiktok" },
  { pattern: /\bpinterest\b/gi, source: "pinterest" },
  { pattern: /\b(?:reddit|subreddit)\b/gi, source: "reddit" },
  { pattern: /\bthreads\b/gi, source: "threads" },
  { pattern: /\b(?:are\.na|arena)\b/gi, source: "arena" },
  { pattern: /\bcosmos\b/gi, source: "cosmos" },
];

const CHAT_OPENERS =
  /^(?:hi|hey|hello|thanks|thank you|cheers|good (?:morning|afternoon|evening)|who|what|when|where|why|how|can|could|would|should|tell|give|write|draft|create|make)\b/i;
const COMPLEX_TASK =
  /\b(?:summari[sz]e|compare|explain|analy[sz]e|organize|categorize|tag|rename|move|export|write|draft)\b/i;
const EDIT_TASK = /\b(?:organize|categorize|tag|rename|retitle|move)\b/i;
const ACTION_SIGNAL =
  /\b(?:import|export|sync now|create(?:\s+a)?\s+folder|delete folder|rename folder|merge tags|empty trash|purge|batch rename|apply filter|show these|grep|copy url|reveal)\b/i;
const SEARCH_SIGNAL =
  /\b(?:find|search|show|browse|look\s+up)\b|\b(?:my|our)\s+(?:saved|saves?|library|references?)\b|\bsaved\s+(?:references?|saves?|items?)\b/i;
const RECENT_SIGNAL =
  /\b(?:recent|recently|latest|newest)\b.*\b(?:saved|saves?|library|items?|pics?|pictures?|photos?|images?|vids?|videos?|articles?|links?)\b|\b(?:recent|latest|newest)\s+(?:pics?|pictures?|photos?|images?|vids?|videos?|articles?|links?)\b/i;
const ATTACHMENT_SIGNAL =
  /\b(?:attached|attachments?|this|that|these|those|it|them|the first|the second)\b/i;
const VAGUE_TARGET = /^(?:it|this|that|these|those|them)$/i;

const LEADING_COMMAND =
  /^(?:please\s+)?(?:(?:find|search|show|browse)(?:\s+for)?|look\s+up)\s+(?:me\s+)?/i;
const LEADING_TASK =
  /^(?:please\s+)?(?:summari[sz]e|compare|explain|analy[sz]e|organize|categorize|tag|rename|retitle|move)\s+/i;
const LIBRARY_FILLER =
  /\b(?:my|our|the|saved|saves|library|references?|items?|stuff)\b/gi;
const FORMAT_SUFFIX =
  /\s+(?:in|as|using|with)\s+(?:one|two|three|four|five|\d+)?\s*(?:short\s+)?(?:sentences?|paragraphs?|bullets?|words?|json|markdown)\b.*$/i;
const CHAINED_TASK =
  /\s+(?:and|then)\s+(?:summari[sz]e|compare|explain|analy[sz]e|organize|categorize|tag|rename|move)\b.*$/i;
const PRESENTATION_FOLLOWUP =
  /[.!?;]\s+(?=(?:show|give|present|display|format|then|only|do not|don't|summari[sz]e|compare|explain|keep)\b)/i;
const RESULT_COUNT =
  /\b(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+(?=(?:(?:recent|latest|newest|saved|[\p{L}-]+)\s+){0,3}(?:saves?|references?|items?|pics?|pictures?|photos?|images?|vids?|videos?|articles?|links?)\b)/iu;
const COUNT_WORDS = [
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
];

function subjectRequest(text: string): string {
  return text.split(PRESENTATION_FOLLOWUP, 1)[0] ?? text;
}

function resultCount(text: string): number | undefined {
  const value = text.match(RESULT_COUNT)?.[1]?.toLowerCase();
  if (!value) return undefined;
  const count = COUNT_WORDS.indexOf(value) + 1 || Number(value);
  return count >= 1 && count <= 24 ? count : undefined;
}

function mediaFor(text: string): MediaType[] {
  const media = new Set<MediaType>();
  for (const entry of MEDIA_WORDS) {
    entry.pattern.lastIndex = 0;
    if (entry.pattern.test(text)) media.add(entry.media);
  }
  return [...media];
}

function sourceFor(text: string): Source | undefined {
  for (const entry of SOURCE_WORDS) {
    entry.pattern.lastIndex = 0;
    if (entry.pattern.test(text)) return entry.source;
  }
  return undefined;
}

function stripNouns(text: string): string {
  let query = text;
  for (const entry of MEDIA_WORDS) {
    entry.pattern.lastIndex = 0;
    query = query.replace(entry.pattern, " ");
  }
  for (const entry of SOURCE_WORDS) {
    entry.pattern.lastIndex = 0;
    query = query.replace(entry.pattern, " ");
  }
  return query;
}

function literalQuery(text: string): string {
  let query = text.trim().replace(/[?.!,;:]+$/g, "");
  if (resultCount(query)) query = query.replace(RESULT_COUNT, "");
  const about = query.match(/\babout\s+(.+)$/i)?.[1];
  if (about) query = about;
  query = query
    .replace(CHAINED_TASK, "")
    .replace(FORMAT_SUFFIX, "")
    .replace(LEADING_COMMAND, "")
    .replace(LEADING_TASK, "");
  query = stripNouns(query);
  return query
    .replace(LIBRARY_FILLER, " ")
    .replace(/\b(?:about|for)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function chatPlan(): AssistantPlan {
  return {
    intent: "chat",
    query: "",
    media: [],
    requiresEvidence: false,
    directLookup: false,
    edit: false,
  };
}

export function planAssistantTurn(input: PlanInput): AssistantPlan {
  const latest = input.latest.trim();
  if (!latest) return chatPlan();

  const subject = subjectRequest(latest);
  const media = mediaFor(subject);
  const source = sourceFor(subject);
  const requestedCount = resultCount(subject);
  const edit = EDIT_TASK.test(latest);
  const complex = COMPLEX_TASK.test(latest);
  if (ACTION_SIGNAL.test(latest) && !SEARCH_SIGNAL.test(latest)) {
    return { ...chatPlan(), edit: true };
  }
  if ((input.attachmentCount ?? 0) > 0 && ATTACHMENT_SIGNAL.test(latest)) {
    return {
      intent: "attachments",
      query: "",
      media,
      source,
      requiresEvidence: true,
      directLookup: false,
      edit,
    };
  }
  if (!input.hasSearch) return chatPlan();
  if (RECENT_SIGNAL.test(latest)) {
    return {
      intent: "recent",
      query: "",
      media,
      source,
      requiresEvidence: true,
      directLookup: !complex && !edit,
      requestedCount,
      edit,
    };
  }

  const words = latest.match(/[\p{L}\p{N}]+/gu) ?? [];
  const bareLibraryPhrase =
    words.length > 0 &&
    words.length <= 8 &&
    !latest.includes("?") &&
    !CHAT_OPENERS.test(latest);
  const needsSearch = SEARCH_SIGNAL.test(latest) || bareLibraryPhrase;
  if (!needsSearch) return chatPlan();

  const query = literalQuery(subject);
  const hasFilters = Boolean(source) || media.length > 0;
  if ((!query || VAGUE_TARGET.test(query)) && !hasFilters) {
    return {
      intent: "clarify",
      query: "",
      media,
      source,
      requiresEvidence: false,
      directLookup: false,
      edit,
    };
  }
  return {
    intent: "search",
    query: VAGUE_TARGET.test(query) ? "" : query,
    media,
    source,
    requiresEvidence: true,
    directLookup: !complex && !edit,
    requestedCount,
    edit,
  };
}
