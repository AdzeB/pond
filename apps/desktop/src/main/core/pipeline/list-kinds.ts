import { type ListKind, type Source, saves } from "@pond/schema/db";
import {
  listKindsEqual,
  mergeListKinds,
  normalizeListKinds,
} from "@pond/schema/list-kinds";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "../../db";
import { persistSave } from "../persist-save";

const EXPLICIT_SAVED = new Set([
  "toolbar",
  "action",
  "context-menu",
  "user:quickAdd",
]);

export function listKindsFromTrigger(trigger: string | undefined): ListKind[] {
  if (!trigger) return [];
  if (EXPLICIT_SAVED.has(trigger)) return ["saved"];
  const suffix = trigger.includes(":")
    ? trigger.slice(trigger.lastIndexOf(":") + 1)
    : trigger;
  if (suffix === "like" || suffix === "upvote") return ["liked"];
  if (
    suffix === "save" ||
    suffix === "bookmark" ||
    suffix === "favorite" ||
    suffix === "graphql-save"
  ) {
    return ["saved"];
  }
  return [];
}

function chunk<T>(rows: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, size + i));
  return out;
}

export async function mergeListKindsOntoExisting(
  source: Source,
  entries: ReadonlyArray<{ sourceId: string; listKinds?: ListKind[] }>,
): Promise<void> {
  const incoming = new Map<string, ListKind[]>();
  for (const entry of entries) {
    const next = normalizeListKinds(entry.listKinds);
    if (next.length === 0) continue;
    incoming.set(
      entry.sourceId,
      mergeListKinds(incoming.get(entry.sourceId), next),
    );
  }
  if (incoming.size === 0) return;

  const db = await getDb();
  for (const idChunk of chunk([...incoming.keys()], 400)) {
    const rows = db
      .select({
        id: saves.id,
        sourceId: saves.sourceId,
        listKinds: saves.listKinds,
      })
      .from(saves)
      .where(and(eq(saves.source, source), inArray(saves.sourceId, idChunk)))
      .all();
    for (const row of rows) {
      const extra = incoming.get(row.sourceId);
      if (!extra) continue;
      const merged = mergeListKinds(row.listKinds, extra);
      if (listKindsEqual(row.listKinds, merged)) continue;
      await persistSave(
        row.id,
        { listKinds: merged },
        { actorReason: "pipeline:list-kinds" },
      );
    }
  }
}
