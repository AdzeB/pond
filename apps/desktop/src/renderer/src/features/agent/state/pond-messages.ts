import type {
  AssistantActivity,
  AssistantChange,
  AssistantMessage,
  AssistantMetadata,
  AssistantQuestion,
  AssistantResultSet,
  AssistantSource,
  AssistantToolStep,
} from "@shared/assistant";
import type { UIMessage } from "ai";
import { z } from "zod";

export type PondDataParts = {
  "pond-activity": { activity: AssistantActivity };
  "pond-sources": AssistantSource[];
  "pond-results": AssistantResultSet[];
  "pond-steps": AssistantToolStep[];
  "pond-question": AssistantQuestion;
  "pond-review": { changes: AssistantChange[] };
};

export type PondUIMessage = UIMessage<AssistantMetadata | null, PondDataParts>;

const textPart = z.object({ type: z.literal("text"), text: z.string() });

export function messageText(message: PondUIMessage) {
  return message.parts
    .flatMap((part) => {
      const parsed = textPart.safeParse(part);
      return parsed.success ? [parsed.data.text] : [];
    })
    .join("");
}

export function toUIMessage(message: AssistantMessage): PondUIMessage {
  const parts: PondUIMessage["parts"] = message.content
    ? [{ type: "text", text: message.content }]
    : [];
  if (message.metadata?.question)
    parts.push({ type: "data-pond-question", data: message.metadata.question });
  if (message.metadata?.changes?.length)
    parts.push({
      type: "data-pond-review",
      data: { changes: message.metadata.changes },
    });
  if (message.metadata?.sources?.length)
    parts.push({ type: "data-pond-sources", data: message.metadata.sources });
  if (message.metadata?.results?.length)
    parts.push({ type: "data-pond-results", data: message.metadata.results });
  if (message.metadata?.steps?.length)
    parts.push({ type: "data-pond-steps", data: message.metadata.steps });
  return {
    id: message.id,
    role: message.role === "user" ? "user" : "assistant",
    parts,
    metadata: message.metadata,
  };
}

export function partData<Name extends keyof PondDataParts>(
  message: PondUIMessage,
  name: Name,
): PondDataParts[Name] | undefined {
  const type = `data-${name}`;
  const part = message.parts.findLast((part) => part.type === type);
  if (!part) return;
  const parsed = z.object({ data: z.unknown() }).safeParse(part);
  if (!parsed.success) return;
  /** SAFETY: UIMessage data parts are typed by PondDataParts. */
  return parsed.data.data as PondDataParts[Name];
}

export function fromUIMessage(
  message: PondUIMessage,
  chatId: string,
): AssistantMessage {
  const question = partData(message, "pond-question");
  const review = partData(message, "pond-review");
  const sources = partData(message, "pond-sources");
  const results = partData(message, "pond-results");
  const steps = partData(message, "pond-steps");
  const metadata = {
    ...message.metadata,
    question: question ?? message.metadata?.question,
    changes: review?.changes ?? message.metadata?.changes,
    sources: sources ?? message.metadata?.sources,
    results: results ?? message.metadata?.results,
    steps: steps ?? message.metadata?.steps,
  };
  return {
    id: message.id,
    chatId,
    role: message.role === "user" ? "user" : "assistant",
    content: messageText(message),
    metadata:
      metadata.question ||
      metadata.changes ||
      metadata.sources ||
      metadata.results ||
      metadata.steps ||
      metadata.attachments
        ? metadata
        : (message.metadata ?? null),
  };
}
