import { agentMessages, saves } from "@pond/schema/db";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import type {
  AssistantChange,
  AssistantMetadata,
} from "../../../shared/assistant";
import { getDb } from "../../db";
import { executeTransaction } from "../executor";
import { folderIdsForSave, listFolders, setSaveFolders } from "../folders";
import { setSaveTags } from "../tags";

export const reviewInput = z.object({
  messageId: z.string().min(1),
  changeIds: z.array(z.string()).min(1).max(24),
  action: z.enum(["apply", "undo", "dismiss"]),
});

export function sameValue(
  a: string | null | string[],
  b: string | null | string[],
): boolean {
  return Array.isArray(a) && Array.isArray(b)
    ? JSON.stringify([...a].sort()) === JSON.stringify([...b].sort())
    : a === b;
}

const reviewing = new Set<string>();

export async function reviewChanges(input: z.infer<typeof reviewInput>) {
  if (reviewing.has(input.messageId))
    throw new Error("These changes are already being processed.");
  reviewing.add(input.messageId);
  try {
    const db = await getDb();
    const message = await db
      .select()
      .from(agentMessages)
      .where(eq(agentMessages.id, input.messageId))
      .get();
    if (message?.role !== "assistant")
      throw new Error("This review no longer exists.");
    const metadata = (message.metadata ?? {}) as AssistantMetadata;
    const changes = metadata.changes ?? [];
    const selected = new Set(input.changeIds);
    for (const change of changes) {
      if (!selected.has(change.id)) continue;
      const eligible =
        input.action === "undo"
          ? change.status === "applied"
          : change.status === "pending";
      if (!eligible) continue;
      try {
        if (input.action === "dismiss") change.status = "dismissed";
        else {
          const current = await db
            .select()
            .from(saves)
            .where(and(eq(saves.id, change.saveId), isNull(saves.deletedAt)))
            .get();
          if (!current) throw new Error("This Save is unavailable.");
          const value =
            change.field === "folders"
              ? await folderIdsForSave(change.saveId)
              : current[change.field];
          const expected =
            input.action === "undo" ? change.after : change.before;
          if (!sameValue(value, expected))
            throw new Error(
              "This value changed since the review. Your newer edit was kept.",
            );
          await writeChange(change, input.action);
          change.status = input.action === "undo" ? "undone" : "applied";
        }
        delete change.error;
      } catch (error) {
        change.error =
          error instanceof Error
            ? error.message
            : "Could not update this Save. Try again.";
      }
      await db
        .update(agentMessages)
        .set({ metadata: { ...metadata, changes } })
        .where(eq(agentMessages.id, input.messageId));
    }
    return { changes };
  } finally {
    reviewing.delete(input.messageId);
  }
}

async function writeChange(change: AssistantChange, action: "apply" | "undo") {
  if (change.field === "folders") {
    const ids = action === "undo" ? change.before : change.after;
    const valid = new Set((await listFolders()).map((f) => f.id));
    if (ids.some((id) => !valid.has(id)))
      throw new Error(
        "A folder no longer exists. Your current folders were kept.",
      );
    await setSaveFolders(change.saveId, ids);
  } else if (change.field === "tags") {
    const result = await setSaveTags(
      change.saveId,
      action === "undo" ? change.before : change.after,
    );
    if (!result.ok) throw new Error("Could not update tags for this Save.");
  } else if (change.field === "title") {
    const patch = { title: action === "undo" ? change.before : change.after };
    const before = { title: action === "undo" ? change.after : change.before };
    await executeTransaction({
      kind: "update",
      model: "save",
      id: change.saveId,
      patch,
      before,
      meta: { actor: "user", actorReason: `assistant:${action}` },
    });
  }
}
