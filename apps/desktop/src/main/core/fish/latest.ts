import type { AssistantMetadata } from "../../../shared/assistant";
import type { FishLatest } from "../../../shared/fish-contracts";

const PREVIEW_LENGTH = 140;

export function plainPreview(markdown: string): string {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, "")
    .replace(/[*_~`]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > PREVIEW_LENGTH
    ? `${text.slice(0, PREVIEW_LENGTH - 1).trimEnd()}…`
    : text;
}

export function latestFromMessage(message: {
  role: string;
  content: string;
  metadata: AssistantMetadata | null;
  createdAt: Date;
}): FishLatest {
  const at = message.createdAt.getTime();
  const metadata = message.metadata;
  if (metadata?.routine) return { from: "routine", text: "", at };
  if (message.role === "user")
    return { from: "you", text: plainPreview(message.content), at };
  const text = plainPreview(message.content);
  if (text) return { from: "fish", text, at };
  const changes = metadata?.changes?.length ?? 0;
  if (changes)
    return {
      from: "fish",
      text: `Proposed ${changes} ${changes === 1 ? "change" : "changes"}`,
      at,
    };
  return { from: "fish", text: metadata?.error ?? "", at };
}
