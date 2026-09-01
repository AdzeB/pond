import { MEDIA_TYPES, type MediaType } from "@pond/schema/db";
import { z } from "zod";

export const assistantPlan = z.object({
  intent: z.enum(["chat", "search", "recent", "attachments", "clarify"]),
  query: z.string().max(150),
  media: z.array(z.enum(MEDIA_TYPES)).max(MEDIA_TYPES.length),
  requiresEvidence: z.boolean(),
  directLookup: z.boolean(),
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

const CHAT_OPENERS =
  /^(?:hi|hey|hello|thanks|thank you|cheers|good (?:morning|afternoon|evening)|who|what|when|where|why|how|can|could|would|should|tell|give|write|draft|create|make)\b/i;
const COMPLEX_TASK =
  /\b(?:summari[sz]e|compare|explain|analy[sz]e|organize|categorize|tag|rename|move|export|write|draft)\b/i;
const EDIT_TASK = /\b(?:organize|categorize|tag|rename|retitle|move)\b/i;
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

function mediaFor(text: string): MediaType[] {
  const media = new Set<MediaType>();
  for (const entry of MEDIA_WORDS) {
    entry.pattern.lastIndex = 0;
    if (entry.pattern.test(text)) media.add(entry.media);
  }
  return [...media];
}

function literalQuery(text: string): string {
  let query = text.trim().replace(/[?.!,;:]+$/g, "");
  const about = query.match(/\babout\s+(.+)$/i)?.[1];
  if (about) query = about;
  query = query
    .replace(CHAINED_TASK, "")
    .replace(FORMAT_SUFFIX, "")
    .replace(LEADING_COMMAND, "")
    .replace(LEADING_TASK, "");
  for (const entry of MEDIA_WORDS) {
    entry.pattern.lastIndex = 0;
    query = query.replace(entry.pattern, " ");
  }
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

  const media = mediaFor(latest);
  const edit = EDIT_TASK.test(latest);
  const complex = COMPLEX_TASK.test(latest);
  if ((input.attachmentCount ?? 0) > 0 && ATTACHMENT_SIGNAL.test(latest)) {
    return {
      intent: "attachments",
      query: "",
      media,
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
      requiresEvidence: true,
      directLookup: !complex && !edit,
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

  const query = literalQuery(latest);
  if (!query || VAGUE_TARGET.test(query)) {
    return {
      intent: "clarify",
      query: "",
      media,
      requiresEvidence: false,
      directLookup: false,
      edit,
    };
  }
  return {
    intent: "search",
    query,
    media,
    requiresEvidence: true,
    directLookup: !complex && !edit,
    edit,
  };
}
