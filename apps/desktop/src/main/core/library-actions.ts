import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { saveFolders, saves } from "@pond/schema/db";
import { labelKey } from "@pond/schema/label-name";
import type { Transaction } from "@pond/schema/tx";
import { applyRenameTemplate } from "@shared/rename-template";
import { resolveShortcuts, type ShortcutPreferences } from "@shared/shortcuts";
import { normalizeHotkey, validateHotkey } from "@tanstack/hotkeys";
import { and, inArray, isNull } from "drizzle-orm";
import { ulid } from "ulid";
import { z } from "zod";
import {
  type ActionChange,
  type ActionDefinition,
  ActionDefinitionSchema,
  type ActionPreview,
  type ActionSaveState,
} from "../../shared/action-contracts";
import { getDb } from "../db";
import { readBundleJson, writeBundleJson } from "../lib/library-config";
import { resolvePaths } from "../paths";
import { executeBatch } from "./executor";
import { normalizeTagList, prepareTagRegistryUpdates } from "./tags";
import { recordBatchForUndo } from "./undo";
import { hasUserTitle } from "./user-metadata";

const Definitions = z.array(ActionDefinitionSchema);
export function readActions(
  root = resolvePaths().libraryRoot,
): ActionDefinition[] {
  const file = join(root, "actions.json");
  const envelope = readBundleJson<ActionDefinition[]>(file);
  if (!envelope) {
    if (existsSync(file))
      throw new Error(
        "Actions could not be read. Restore actions.json from a backup.",
      );
    return [];
  }
  return Definitions.parse(envelope.data);
}
export function saveAction(
  definition: ActionDefinition,
  root = resolvePaths().libraryRoot,
  preferences: ShortcutPreferences = { profile: "pond", overrides: {} },
): ActionDefinition {
  const parsed = normalizeActionDefinition(definition);
  const definitions = readActions(root);
  const reserved = Object.values(resolveShortcuts(preferences)).find(
    (shortcut) =>
      "keys" in shortcut &&
      shortcut.keys &&
      parsed.shortcut &&
      normalizeHotkey(shortcut.keys) === parsed.shortcut,
  );
  if (reserved)
    throw new Error(`This shortcut is already assigned to ${reserved.label}.`);
  const conflict = definitions.find(
    (item) =>
      item.id !== parsed.id &&
      item.shortcut &&
      parsed.shortcut &&
      normalizeHotkey(item.shortcut) === parsed.shortcut,
  );
  if (conflict)
    throw new Error(`This shortcut is already assigned to ${conflict.name}.`);
  const index = definitions.findIndex((item) => item.id === parsed.id);
  if (index < 0) definitions.push(parsed);
  else definitions[index] = parsed;
  writeBundleJson(join(root, "actions.json"), definitions);
  return parsed;
}
export function duplicateAction(
  id: string,
  root = resolvePaths().libraryRoot,
): ActionDefinition {
  const source = readActions(root).find((item) => item.id === id);
  if (!source) throw new Error("The Action no longer exists.");
  const duplicate = normalizeActionDefinition({
    ...source,
    id: ulid(),
    name: `${source.name} Copy`,
    shortcut: null,
  });
  writeBundleJson(join(root, "actions.json"), [
    ...readActions(root),
    duplicate,
  ]);
  return duplicate;
}
export function deleteAction(
  id: string,
  root = resolvePaths().libraryRoot,
): void {
  writeBundleJson(
    join(root, "actions.json"),
    readActions(root).filter((item) => item.id !== id),
  );
}

export function previewAction(
  definition: ActionDefinition,
  rows: readonly (ActionSaveState & { id: string })[],
): ActionPreview {
  const changes: ActionChange[] = [];
  for (const [index, row] of rows.entries()) {
    const before: ActionSaveState = {
      folderIds: [...row.folderIds],
      title: row.title,
      tags: [...row.tags],
      rating: row.rating,
      notes: row.notes,
    };
    const after: ActionSaveState = { ...before, tags: [...before.tags] };
    for (const step of definition.steps) {
      switch (step.kind) {
        case "add-folders":
          after.folderIds = [
            ...new Set([...after.folderIds, ...step.folderIds]),
          ].sort();
          break;
        case "remove-folders":
          after.folderIds = after.folderIds.filter(
            (id) => !step.folderIds.includes(id),
          );
          break;
        case "add-tags":
          after.tags = normalizeTagList([...after.tags, ...step.tags]);
          break;
        case "remove-tags":
          after.tags = after.tags.filter(
            (tag) =>
              !step.tags.some((remove) => labelKey(remove) === labelKey(tag)),
          );
          break;
        case "rating":
          after.rating = step.rating || null;
          break;
        case "notes":
          after.notes =
            step.mode === "append"
              ? [after.notes, step.text].filter(Boolean).join("\n")
              : step.text;
          break;
        case "rename": {
          after.title = applyRenameTemplate(step.pattern, {
            index,
            start: step.start,
            padding: step.padding,
            title: after.title ?? "Untitled",
            id: row.id,
            tags: after.tags,
            original: before.title,
            replacement: step.replacement,
          });
          break;
        }
      }
    }
    if (JSON.stringify(before) !== JSON.stringify(after))
      changes.push({ id: row.id, before, after });
  }
  const token = createHash("sha256")
    .update(JSON.stringify({ definition, rows }))
    .digest("hex");
  return { token, changes, unchanged: rows.length - changes.length };
}

function normalizeActionDefinition(
  definition: ActionDefinition,
): ActionDefinition {
  const parsed = ActionDefinitionSchema.parse(definition);
  if (!parsed.shortcut) return parsed;
  const validation = validateHotkey(parsed.shortcut);
  if (!validation.valid || validation.warnings.length > 0)
    throw new Error("Enter a valid Action shortcut.");
  return { ...parsed, shortcut: normalizeHotkey(parsed.shortcut) };
}

export interface ActionRuntime {
  read(ids: readonly string[]): Promise<(ActionSaveState & { id: string })[]>;
  prepareTags(names: string[]): Promise<Transaction[]>;
  commit(transactions: Transaction[]): Promise<void>;
  recordUndo(transactions: Transaction[]): void;
}
const actionRuntime: ActionRuntime = {
  prepareTags: prepareTagRegistryUpdates,
  async read(ids) {
    const db = await getDb();
    const ordered = [...new Set(ids)];
    const byId = new Map<string, ActionSaveState & { id: string }>();
    for (let offset = 0; offset < ordered.length; offset += 1000) {
      const rows = await db
        .select({
          id: saves.id,
          title: saves.title,
          tags: saves.tags,
          rating: saves.rating,
          notes: saves.notes,
        })
        .from(saves)
        .where(
          and(
            inArray(saves.id, ordered.slice(offset, offset + 1000)),
            isNull(saves.deletedAt),
          ),
        );
      const memberships = await db
        .select()
        .from(saveFolders)
        .where(
          inArray(saveFolders.saveId, ordered.slice(offset, offset + 1000)),
        );
      const bySave = new Map<string, string[]>();
      for (const member of memberships) {
        const ids = bySave.get(member.saveId) ?? [];
        ids.push(member.folderId);
        bySave.set(member.saveId, ids);
      }
      for (const row of rows)
        byId.set(row.id, {
          ...row,
          folderIds: (bySave.get(row.id) ?? []).sort(),
        });
    }
    const rows = ordered.map((id) => {
      const row = byId.get(id);
      if (!row)
        throw new Error(
          "A selected save is no longer available. Refresh the selection.",
        );
      return row;
    });
    return rows;
  },
  async commit(transactions) {
    for (const tx of transactions)
      if (
        tx.model === "save" &&
        tx.kind === "update" &&
        tx.patch.title !== tx.before.title
      )
        tx.titleLock = { before: hasUserTitle(tx.id), after: true };
    await executeBatch(transactions);
  },
  recordUndo: recordBatchForUndo,
};
export async function prepareAction(
  definition: ActionDefinition,
  ids: readonly string[],
  runtime: ActionRuntime = actionRuntime,
): Promise<ActionPreview> {
  return previewAction(definition, await runtime.read([...new Set(ids)]));
}
export async function runAction(
  definition: ActionDefinition,
  ids: readonly string[],
  expectedToken: string,
  runtime: ActionRuntime = actionRuntime,
): Promise<number> {
  const preview = await prepareAction(definition, ids, runtime);
  if (preview.token !== expectedToken)
    throw new Error(
      "The selection changed. Review a new preview before running the action.",
    );
  const transactions: Transaction[] = preview.changes.flatMap((change) => {
    const { folderIds: previousFolders, ...before } = change.before;
    const { folderIds: nextFolders, ...after } = change.after;
    const result: Transaction[] = [];
    const meta = {
      actor: "user" as const,
      actorReason: `action:${definition.name}`,
    };
    if (JSON.stringify(before) !== JSON.stringify(after))
      result.push({
        kind: "update",
        model: "save",
        id: change.id,
        patch: after,
        before,
        meta,
      });
    if (JSON.stringify(previousFolders) !== JSON.stringify(nextFolders))
      result.push({
        kind: "update",
        model: "save_folder",
        id: change.id,
        patch: { folderIds: nextFolders },
        before: { folderIds: previousFolders },
        meta,
      });
    return result;
  });
  const changedTags = preview.changes.flatMap((change) =>
    JSON.stringify(change.before.tags) === JSON.stringify(change.after.tags)
      ? []
      : change.after.tags,
  );
  transactions.unshift(...(await runtime.prepareTags(changedTags)));
  await runtime.commit(transactions);
  runtime.recordUndo(transactions);
  return preview.changes.length;
}
