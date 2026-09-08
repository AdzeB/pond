import { agentChats, agentMessages } from "@pond/schema/db";
import type { ModelMessage } from "@tanstack/ai";
import {
  defineAIPersistence,
  defineMessageStore,
} from "@tanstack/ai-persistence";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { assistantMetadata } from "../../../shared/assistant";
import { type Db, getDb } from "../../db";
import { answerProblem } from "./output";

const metadata = z.record(z.string(), z.json());
const source = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("data"),
    value: z.string(),
    mimeType: z.string(),
  }),
  z.object({
    type: z.literal("url"),
    value: z.string(),
    mimeType: z.string().optional(),
  }),
]);
const part = z.union([
  z.object({
    type: z.literal("text"),
    content: z.string(),
    metadata: z.json().optional(),
  }),
  z.object({
    type: z.enum(["image", "audio", "video", "document"]),
    source,
    metadata: z.json().optional(),
  }),
]);
const transcriptSchema = z.array(
  z.object({
    id: z.string().optional(),
    role: z.enum(["user", "assistant", "tool"]),
    content: z.union([z.string(), z.null(), z.array(part)]),
    name: z.string().optional(),
    toolCallId: z.string().optional(),
    toolCalls: z
      .array(
        z.object({
          id: z.string(),
          type: z.literal("function"),
          function: z.object({ name: z.string(), arguments: z.string() }),
          metadata: z.json().optional(),
        }),
      )
      .optional(),
    thinking: z
      .array(
        z.object({ content: z.string(), signature: z.string().optional() }),
      )
      .optional(),
    error: z.string().optional(),
    metadata: metadata.optional(),
    createdAt: z.coerce.date().optional(),
    structuredOutput: z
      .object({
        type: z.literal("structured-output"),
        status: z.enum(["streaming", "complete", "error"]),
        partial: z.json().optional(),
        data: z.json().optional(),
        raw: z.string(),
        reasoning: z.string().optional(),
        errorMessage: z.string().optional(),
      })
      .optional(),
  }),
);

export function createAgentPersistence(db: Pick<Db, "select" | "update">) {
  return defineAIPersistence({
    stores: {
      messages: defineMessageStore({
        async loadThread(threadId): Promise<ModelMessage[]> {
          const thread = db
            .select({ transcript: agentChats.canonicalTranscript })
            .from(agentChats)
            .where(eq(agentChats.id, threadId))
            .get();
          if (!thread) return [];
          if (thread.transcript !== null)
            return transcriptSchema.parse(JSON.parse(thread.transcript));
          return projectMessages(db, threadId);
        },
        async saveThread(threadId, messages) {
          const result = db
            .update(agentChats)
            .set({
              canonicalTranscript: JSON.stringify(messages),
            })
            .where(eq(agentChats.id, threadId))
            .run();
          if (result.changes !== 1)
            throw new Error("This conversation no longer exists.");
        },
      }),
    },
  });
}

export async function agentPersistence() {
  return createAgentPersistence(await getDb());
}

export async function loadModelTranscript(
  chatId: string,
  database?: Pick<Db, "select" | "update">,
) {
  const db = database ?? (await getDb());
  const canonical =
    await createAgentPersistence(db).stores.messages.loadThread(chatId);
  const reconciled = reconcileTranscript(
    canonical,
    projectMessages(db, chatId),
  );
  let request = "";
  return reconciled.flatMap((message): ModelMessage[] => {
    const direct = z.string().safeParse(message.content);
    const text = direct.success
      ? direct.data
      : (z
          .array(part)
          .nullable()
          .parse(message.content)
          ?.flatMap((part) => (part.type === "text" ? [part.content] : []))
          .join("\n") ?? "");
    if (message.role === "user") request = text;
    if (message.role !== "assistant" || !answerProblem(text, request))
      return [message];
    return message.toolCalls?.length ? [{ ...message, content: null }] : [];
  });
}

function projectMessages(
  db: Pick<Db, "select">,
  chatId: string,
): ModelMessage[] {
  return db
    .select()
    .from(agentMessages)
    .where(eq(agentMessages.chatId, chatId))
    .orderBy(asc(agentMessages.createdAt), asc(agentMessages.id))
    .all()
    .map((message) => {
      const details = assistantMetadata.parse(message.metadata ?? {});
      return {
        id: message.id,
        role: z.enum(["user", "assistant"]).parse(message.role),
        content: details.question
          ? `${message.content}\n${details.question.question}\n${details.question.options.join("; ")}`
          : message.content,
        createdAt: message.createdAt,
      };
    });
}

function reconcileTranscript(
  canonical: ModelMessage[],
  projected: ModelMessage[],
): ModelMessage[] {
  const result: ModelMessage[] = [];
  for (let index = 0; index < projected.length; index++) {
    const message = projected[index];
    if (!message) continue;
    if (message.role !== "user") {
      result.push(message);
      continue;
    }
    const start = canonical.findIndex(
      (row) => row.id === message.id && row.role === "user",
    );
    if (start < 0) {
      result.push(message);
      continue;
    }
    const next = canonical.findIndex(
      (row, offset) => offset > start && row.role === "user",
    );
    const turn = canonical.slice(start, next < 0 ? undefined : next);
    const response = projected[index + 1];
    if (response?.role === "assistant") {
      const last = turn.findLastIndex(
        (row) => row.role === "assistant" && !row.toolCalls?.length,
      );
      if (last >= 0) turn[last] = { ...turn[last], ...response };
      else turn.push(response);
      index++;
    }
    result.push(...turn);
  }
  return result;
}
