import { type AgentChat, agentChats, agentMessages } from "@pond/schema/db";
import { asc, desc, eq } from "drizzle-orm";
import { ulid } from "ulid";
import type { AssistantMetadata } from "../../../shared/assistant";
import type {
  OkResult,
  OkSuccess,
} from "../../../shared/query-contracts-shared";
import { getDb } from "../../db";
import { chatTitle } from "./chat-title";

export async function listChats(): Promise<
  Omit<AgentChat, "canonicalTranscript">[]
> {
  const db = await getDb();
  return db
    .select({
      id: agentChats.id,
      title: agentChats.title,
      createdAt: agentChats.createdAt,
      updatedAt: agentChats.updatedAt,
    })
    .from(agentChats)
    .orderBy(desc(agentChats.updatedAt));
}

export async function createChat(): Promise<
  Omit<AgentChat, "canonicalTranscript">
> {
  const db = await getDb();
  const id = ulid();
  await db.insert(agentChats).values({ id, title: null });
  const rows = await db
    .select({
      id: agentChats.id,
      title: agentChats.title,
      createdAt: agentChats.createdAt,
      updatedAt: agentChats.updatedAt,
    })
    .from(agentChats)
    .where(eq(agentChats.id, id));
  const created = rows[0];
  if (!created) throw new Error("agent chat create failed");
  return created;
}

export async function renameChat(id: string, title: string): Promise<OkResult> {
  const db = await getDb();
  const rows = await db
    .update(agentChats)
    .set({ title, updatedAt: new Date() })
    .where(eq(agentChats.id, id))
    .returning({ id: agentChats.id });
  return rows.length > 0
    ? { ok: true }
    : { ok: false, error: "This chat no longer exists." };
}

export async function deleteChat(id: string): Promise<OkSuccess> {
  const db = await getDb();
  await db.delete(agentMessages).where(eq(agentMessages.chatId, id));
  await db.delete(agentChats).where(eq(agentChats.id, id));
  return { ok: true };
}

export async function listMessages(chatId: string) {
  const db = await getDb();
  return db
    .select()
    .from(agentMessages)
    .where(eq(agentMessages.chatId, chatId))
    .orderBy(asc(agentMessages.createdAt), asc(agentMessages.id));
}

export async function appendMessage(input: {
  chatId: string;
  role: "user" | "assistant";
  content: string;
  metadata?: AssistantMetadata;
}): Promise<string> {
  const db = await getDb();
  const id = ulid();
  await db.insert(agentMessages).values({
    id,
    chatId: input.chatId,
    role: input.role,
    content: input.content,
    metadata: input.metadata ? { ...input.metadata } : null,
  });
  const current = await db
    .select({ title: agentChats.title })
    .from(agentChats)
    .where(eq(agentChats.id, input.chatId));
  const title =
    current[0]?.title ||
    (input.role === "user" ? chatTitle(input.content) : null);
  const patch: Partial<AgentChat> = { updatedAt: new Date() };
  if (title) patch.title = title;
  await db.update(agentChats).set(patch).where(eq(agentChats.id, input.chatId));
  return id;
}
