import { copyFile, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { agentMessages, type ImageComment, saves } from "@pond/schema/db";
import { eq, inArray, isNotNull } from "drizzle-orm";
import { clipboard, shell } from "electron";
import { ulid } from "ulid";
import { z } from "zod";
import type {
  AssistantChange,
  AssistantMetadata,
} from "../../../shared/assistant";
import { ASSISTANT_CHANGE_CAP } from "../../../shared/assistant";
import { getDb } from "../../db";
import { resolveSaveFilePath } from "../../ipc/helpers";
import { toCsv } from "../../lib/csv";
import { executeBatch, executeTransaction } from "../executor";
import {
  createFolder,
  deleteFolder,
  folderIdsForSave,
  listFolders,
  renameFolder,
  setSaveFolders,
} from "../folders";
import { enqueue } from "../pipeline/enqueue";
import { refreshSave } from "../refresh";
import { archiveSiteForSave } from "../refresh/archive-backfill";
import { createView, listViews, updateView } from "../saved-views";
import { syncAccount } from "../sync";
import { createTag, mergeTags, renameTag, setSaveTags } from "../tags";

export const reviewInput = z.object({
  messageId: z.string().min(1),
  changeIds: z.array(z.string()).min(1).max(ASSISTANT_CHANGE_CAP),
  action: z.enum(["apply", "undo", "dismiss"]),
});

export function sameValue(
  a: string | number | null | string[],
  b: string | number | null | string[],
): boolean {
  return Array.isArray(a) && Array.isArray(b)
    ? JSON.stringify([...a].sort()) === JSON.stringify([...b].sort())
    : a === b;
}

function commentTexts(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const text = (entry as { text?: unknown }).text;
    return typeof text === "string" && text.trim() ? [text] : [];
  });
}

function toComments(texts: string[], previous: unknown): ImageComment[] {
  const existing = Array.isArray(previous) ? (previous as ImageComment[]) : [];
  return texts.map((text, index) => ({
    id: existing[index]?.id ?? ulid(),
    x: existing[index]?.x ?? 0,
    y: existing[index]?.y ?? 0,
    w: existing[index]?.w ?? 1,
    h: existing[index]?.h ?? 1,
    text,
  }));
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
        else if (change.field === "action") {
          await writeAction(change, input.action);
          change.status = input.action === "undo" ? "undone" : "applied";
        } else {
          const current = await db
            .select()
            .from(saves)
            .where(eq(saves.id, change.saveId))
            .get();
          if (!current) throw new Error("This Save is unavailable.");
          const value =
            change.field === "folders"
              ? await folderIdsForSave(change.saveId)
              : change.field === "note"
                ? (current.notes ?? "")
                : change.field === "comments"
                  ? commentTexts(current.comments)
                  : change.field === "rating"
                    ? (current.rating ?? null)
                    : change.field === "trash"
                      ? current.deletedAt
                        ? "trashed"
                        : "active"
                      : current[change.field];
          const expected =
            input.action === "undo" ? change.after : change.before;
          if (
            change.field !== "rating" &&
            !sameValue(
              value as string | string[] | null,
              expected as string | string[] | null,
            )
          )
            throw new Error(
              "This value changed since the review. Your newer edit was kept.",
            );
          if (change.field === "rating" && value !== expected)
            throw new Error(
              "This value changed since the review. Your newer edit was kept.",
            );
          await writeChange(change, input.action, current.comments);
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

async function writeChange(
  change: AssistantChange,
  action: "apply" | "undo",
  previousComments: unknown,
) {
  if (change.field === "folders") {
    const ids = action === "undo" ? change.before : change.after;
    const valid = new Set((await listFolders()).map((folder) => folder.id));
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
  } else if (change.field === "title" || change.field === "note") {
    const key = change.field === "note" ? "notes" : "title";
    const next = action === "undo" ? change.before : change.after;
    const prev = action === "undo" ? change.after : change.before;
    await executeTransaction({
      kind: "update",
      model: "save",
      id: change.saveId,
      patch: { [key]: next },
      before: { [key]: prev },
      meta: { actor: "agent", actorReason: `assistant:${action}` },
    });
  } else if (change.field === "rating") {
    const next = action === "undo" ? change.before : change.after;
    const prev = action === "undo" ? change.after : change.before;
    await executeTransaction({
      kind: "update",
      model: "save",
      id: change.saveId,
      patch: { rating: next },
      before: { rating: prev },
      meta: { actor: "agent", actorReason: `assistant:${action}` },
    });
  } else if (change.field === "comments") {
    const next = action === "undo" ? change.before : change.after;
    await executeTransaction({
      kind: "update",
      model: "save",
      id: change.saveId,
      patch: { comments: toComments(next, previousComments) },
      before: { comments: toComments(change.before, previousComments) },
      meta: { actor: "agent", actorReason: `assistant:${action}` },
    });
  } else if (change.field === "trash") {
    const next = action === "undo" ? change.before : change.after;
    await executeTransaction({
      kind: next === "trashed" ? "trash" : "untrash",
      model: "save",
      id: change.saveId,
      meta: { actor: "agent", actorReason: `assistant:${action}` },
    });
  }
}

async function writeAction(
  change: Extract<AssistantChange, { field: "action" }>,
  action: "apply" | "undo",
) {
  if (action === "undo") {
    if (
      change.action === "folderCreate" &&
      typeof change.payload?.id === "string"
    )
      await deleteFolder(change.payload.id);
    else if (
      change.action === "folderRename" &&
      typeof change.payload?.id === "string" &&
      change.before
    )
      await renameFolder(change.payload.id, change.before);
    else if (
      change.action === "tagRename" &&
      change.before &&
      typeof change.payload?.to === "string"
    )
      await renameTag(change.payload.to, change.before);
    else if (
      change.action === "quickAdd" &&
      typeof change.payload?.id === "string"
    )
      await executeTransaction({
        kind: "trash",
        model: "save",
        id: change.payload.id,
        meta: { actor: "agent", actorReason: "assistant:undo" },
      });
    else if (
      change.action === "mergeDuplicates" &&
      Array.isArray(change.payload?.ids)
    ) {
      await executeBatch(
        (change.payload.ids as string[]).map((id) => ({
          kind: "untrash" as const,
          model: "save" as const,
          id,
          meta: { actor: "agent" as const, actorReason: "assistant:undo" },
        })),
      );
    } else throw new Error("This action cannot be undone from here.");
    return;
  }
  const payload = change.payload ?? {};
  if (change.action === "folderCreate") {
    const folder = await createFolder({
      name: String(payload.name ?? change.after),
      parentId: typeof payload.parentId === "string" ? payload.parentId : null,
    });
    payload.id = folder.id;
  } else if (change.action === "folderRename") {
    await renameFolder(String(payload.id ?? ""), change.after);
  } else if (change.action === "folderDelete") {
    await deleteFolder(String(payload.id ?? ""));
  } else if (change.action === "tagCreate") {
    await createTag({ name: change.after });
  } else if (change.action === "tagRename") {
    await renameTag(String(payload.from ?? ""), change.after);
  } else if (change.action === "tagMerge") {
    await mergeTags(String(payload.from ?? ""), change.after);
  } else if (change.action === "savedViewCreate") {
    const created = await createView({
      name: change.after,
      query: (payload.query as never) ?? undefined,
      sortKey:
        typeof payload.sortKey === "string" ? payload.sortKey : undefined,
      sortDir:
        typeof payload.sortDir === "string" ? payload.sortDir : undefined,
      layout: typeof payload.layout === "string" ? payload.layout : undefined,
    });
    payload.id = created.id;
  } else if (change.action === "savedViewRename") {
    await updateView(String(payload.id ?? ""), { name: change.after });
  } else if (change.action === "savedViewUpdate") {
    const views = await listViews();
    const view = views.find((row) => row.id === payload.id);
    if (!view) throw new Error("This saved view no longer exists.");
    await updateView(view.id, {
      query: (payload.query as never) ?? view.query,
    });
  } else if (change.action === "quickAdd") {
    const url = String(payload.url ?? change.after);
    const result = await enqueue(url, { trigger: "user:quickAdd" });
    if ("id" in result) payload.id = result.id;
  } else if (change.action === "mergeDuplicates") {
    const keepId = String(payload.keepId ?? "");
    const ids = Array.isArray(payload.ids)
      ? payload.ids.filter((id): id is string => typeof id === "string")
      : [];
    const extras = ids.filter((id) => id && id !== keepId);
    await executeBatch(
      extras.map((id) => ({
        kind: "trash" as const,
        model: "save" as const,
        id,
        meta: { actor: "agent" as const, actorReason: "assistant:merge" },
      })),
    );
  } else if (change.action === "exportFiles" || change.action === "exportCsv") {
    const directory = String(payload.directory ?? "");
    const ids = Array.isArray(payload.ids)
      ? payload.ids.filter((id): id is string => typeof id === "string")
      : [];
    if (!directory) throw new Error("Choose an export folder first.");
    await exportToDirectory(ids, directory, change.action === "exportCsv");
  } else if (change.action === "syncNow") {
    await syncAccount(String(payload.accountId ?? ""), { trigger: "manual" });
  } else if (change.action === "refresh") {
    await refreshSave(change.saveId);
  } else if (change.action === "archive") {
    await archiveSiteForSave(change.saveId);
  } else if (change.action === "copyUrl") {
    const db = await getDb();
    const row = await db
      .select({ url: saves.url })
      .from(saves)
      .where(eq(saves.id, change.saveId))
      .get();
    if (!row?.url) throw new Error("This Save has no URL.");
    clipboard.writeText(row.url);
  } else if (change.action === "reveal") {
    const target = await resolveSaveFilePath(change.saveId, 0);
    if (!target.ok) throw new Error("Could not reveal this Save.");
    shell.showItemInFolder(target.path);
  } else if (change.action === "batchRename") {
    const pattern = String(payload.pattern ?? "");
    const ids = Array.isArray(payload.ids)
      ? payload.ids.filter((id): id is string => typeof id === "string")
      : [];
    const db = await getDb();
    const rows = await db.select().from(saves).where(inArray(saves.id, ids));
    let n = 0;
    await executeBatch(
      rows.flatMap((row) => {
        n += 1;
        const title = pattern
          .replaceAll("{n}", String(n))
          .replaceAll("{title}", row.title ?? "Untitled")
          .replaceAll("{id}", row.id);
        if (title === row.title) return [];
        return [
          {
            kind: "update" as const,
            model: "save" as const,
            id: row.id,
            patch: { title },
            before: { title: row.title },
            meta: { actor: "agent" as const, actorReason: "assistant:rename" },
          },
        ];
      }),
    );
  } else if (change.action === "purgeTrash") {
    const db = await getDb();
    const rows = await db
      .select()
      .from(saves)
      .where(isNotNull(saves.deletedAt));
    await executeBatch(
      rows.map((row) => ({
        kind: "purge" as const,
        model: "save" as const,
        id: row.id,
        before: row,
        meta: { actor: "agent" as const, actorReason: "assistant:purge" },
      })),
    );
  }
}

function sanitizeName(value: string): string {
  return value
    .replace(/[/\\?%*:|"<>]/g, "_")
    .trim()
    .slice(0, 120);
}

async function exportToDirectory(
  ids: string[],
  directory: string,
  csv: boolean,
) {
  const db = await getDb();
  const rows = await db.select().from(saves).where(inArray(saves.id, ids));
  if (csv) {
    const columns = ["id", "source", "title", "url", "author", "notes"];
    await writeFile(
      join(directory, "pond-export.csv"),
      toCsv(
        rows.map((row) =>
          columns.map((column) =>
            String(row[column as keyof typeof row] ?? ""),
          ),
        ),
        columns,
      ),
    );
    return;
  }
  const used = new Set<string>();
  for (const row of rows) {
    const target = await resolveSaveFilePath(row.id, row.coverIndex ?? 0);
    if (!target.ok) continue;
    const ext = extname(target.path);
    const base =
      sanitizeName(row.title ?? basename(target.path, ext)) || row.id;
    let name = `${base}${ext}`;
    let n = 1;
    while (used.has(name.toLowerCase())) name = `${base}-${n++}${ext}`;
    used.add(name.toLowerCase());
    await copyFile(target.path, join(directory, name));
  }
}
