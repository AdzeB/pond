import { type AgentChat, agentChats, agentMessages } from "@pond/schema/db";
import { asc, desc, eq } from "drizzle-orm";
import { ulid } from "ulid";
import type { AssistantMetadata } from "../../../shared/assistant";
import { getDb } from "../../db";

export async function listChats(): Promise<AgentChat[]> {
  const db = await getDb();
  return db.select().from(agentChats).orderBy(desc(agentChats.updatedAt));
}

export async function createChat(): Promise<AgentChat> {
  const db = await getDb();
  const id = ulid();
  await db.insert(agentChats).values({ id, title: null });
  const rows = await db.select().from(agentChats).where(eq(agentChats.id, id));
  const created = rows[0];
  if (!created) throw new Error("agent chat create failed");
  return created;
}

export async function deleteChat(id: string): Promise<{ ok: boolean }> {
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

export async function recentMessages(chatId: string, limit = 24) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(agentMessages)
    .where(eq(agentMessages.chatId, chatId))
    .orderBy(desc(agentMessages.createdAt), desc(agentMessages.id))
    .limit(limit);
  return rows.reverse();
}

export async function appendMessage(input: {
  chatId: string;
  role: "user" | "assistant";
  content: string;
  metadata?: AssistantMetadata;
}): Promise<void> {
  const db = await getDb();
  await db.insert(agentMessages).values({
    id: ulid(),
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
    (input.role === "user" ? titleFrom(input.content) : null);
  await db
    .update(agentChats)
    .set({
      updatedAt: new Date(),
      ...(title ? { title } : {}),
    })
    .where(eq(agentChats.id, input.chatId));
}

function titleFrom(content: string): string | undefined {
  const trimmed = content.trim().replace(/\s+/g, " ");
  if (!trimmed) return undefined;
  return trimmed.length > 48 ? `${trimmed.slice(0, 48)}…` : trimmed;
}
