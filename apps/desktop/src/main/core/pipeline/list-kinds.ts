import { type ListKind, type Source, saves } from "@pond/schema/db";
import {
  listKindsEqual,
  mergeListKinds,
  normalizeListKinds,
} from "@pond/schema/list-kinds";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "../../db";
import { persistSave } from "../persist-save";
import { releaseListFilteredSaves } from "./import-filter";

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

/** Returns the source ids of list-filtered saves found on another list; they're purged so the run queues them as new. */
export async function mergeListKindsOntoExisting(
  source: Source,
  entries: ReadonlyArray<{ sourceId: string; listKinds?: ListKind[] }>,
): Promise<Set<string>> {
  const relisted = new Set<string>();
  const incoming = new Map<string, ListKind[]>();
  for (const entry of entries) {
    const next = normalizeListKinds(entry.listKinds);
    if (next.length === 0) continue;
    incoming.set(
      entry.sourceId,
      mergeListKinds(incoming.get(entry.sourceId), next),
    );
  }
  if (incoming.size === 0) return relisted;

  const db = await getDb();
  const released: string[] = [];
  for (const idChunk of chunk([...incoming.keys()], 400)) {
    const rows = db
      .select({
        id: saves.id,
        sourceId: saves.sourceId,
        listKinds: saves.listKinds,
        status: saves.status,
        importFilter: sql<
          string | null
        >`json_extract(${saves.rawJson}, '$.importFilter')`,
      })
      .from(saves)
      .where(and(eq(saves.source, source), inArray(saves.sourceId, idChunk)))
      .all();
    for (const row of rows) {
      const extra = incoming.get(row.sourceId);
      if (!extra) continue;
      const merged = mergeListKinds(row.listKinds, extra);
      if (listKindsEqual(row.listKinds, merged)) continue;
      if (row.status === "skipped" && row.importFilter === "list") {
        released.push(row.id);
        relisted.add(row.sourceId);
        continue;
      }
      await persistSave(
        row.id,
        { listKinds: merged },
        { actorReason: "pipeline:list-kinds" },
      );
    }
  }
  await releaseListFilteredSaves(released);
  return relisted;
}
