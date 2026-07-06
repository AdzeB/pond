import {
  DEFAULT_SOURCE_SYNC_PREFS,
  type Source,
  type SourceSyncPrefs,
  saves,
} from "@pond/schema/db";
import { count, desc, eq } from "drizzle-orm";
import { getDb } from "../../db";
import { getPrefs, setPrefs } from "../prefs";

export async function getSourceSync(source: Source): Promise<SourceSyncPrefs> {
  const prefs = await getPrefs();
  return { ...DEFAULT_SOURCE_SYNC_PREFS, ...prefs.sync.sources[source] };
}

export async function patchSourceSync(
  source: Source,
  patch: Partial<SourceSyncPrefs>,
): Promise<SourceSyncPrefs> {
  const prefs = await getPrefs();
  const next: SourceSyncPrefs = {
    ...DEFAULT_SOURCE_SYNC_PREFS,
    ...prefs.sync.sources[source],
    ...patch,
  };
  await setPrefs({
    sync: { sources: { ...prefs.sync.sources, [source]: next } },
  });
  return next;
}

// Most-recent known ids loaded for an incremental run. Lists are newest-first,
// so this window is enough to detect the already-synced backlog and early-stop.
const RECENT_KNOWN_WINDOW = 1500;

export interface SyncBaseline {
  // Known source ids for dedup + harvester early-stop. Full set on a full sync,
  // a bounded recent window on an incremental sync.
  knownIds: Set<string>;
  // True library size for this source (UI + watermark).
  total: number;
  // Whether this run is a full walk (first sync or forced).
  full: boolean;
}

// Decide full vs incremental and load the right baseline. A full walk happens on
// the very first sync (no prior full sync recorded) or when explicitly forced.
export async function loadSyncBaseline(
  source: Source,
  forceFull: boolean,
): Promise<SyncBaseline> {
  const db = await getDb();
  const cfg = await getSourceSync(source);
  const full = forceFull || cfg.lastFullSyncAt === null;
  if (full) {
    const rows = await db
      .select({ sourceId: saves.sourceId })
      .from(saves)
      .where(eq(saves.source, source));
    const knownIds = new Set<string>(rows.map((r) => r.sourceId));
    return { knownIds, total: knownIds.size, full: true };
  }
  const rows = await db
    .select({ sourceId: saves.sourceId })
    .from(saves)
    .where(eq(saves.source, source))
    .orderBy(desc(saves.savedAt))
    .limit(RECENT_KNOWN_WINDOW);
  const knownIds = new Set<string>(rows.map((r) => r.sourceId));
  const totalRow = await db
    .select({ c: count() })
    .from(saves)
    .where(eq(saves.source, source))
    .get();
  return { knownIds, total: totalRow?.c ?? knownIds.size, full: false };
}

// Persist the incremental cursor after a successful run. Only advance
// `lastFullSyncAt` on a full walk so the next run can go incremental.
export async function persistWatermark(
  source: Source,
  opts: { full: boolean; newestId: string | null; total: number },
): Promise<string> {
  const lastSyncedAt = new Date().toISOString();
  const patch: Partial<SourceSyncPrefs> = {
    lastSyncedAt,
    lastError: null,
    knownCount: opts.total,
  };
  if (opts.newestId) patch.highWaterMark = opts.newestId;
  if (opts.full) patch.lastFullSyncAt = lastSyncedAt;
  await patchSourceSync(source, patch);
  return lastSyncedAt;
}
