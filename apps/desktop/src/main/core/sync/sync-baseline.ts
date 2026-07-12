import {
  type ConnectedAccount,
  type SourceSyncPrefs,
  saves,
} from "@pond/schema/db";
import { and, count, desc, eq, isNull, or } from "drizzle-orm";
import { getDb } from "../../db";
import { getAccountSync, patchAccountSync } from "./accounts";

export { getAccountSync, patchAccountSync } from "./accounts";

// Most-recent known ids loaded for an incremental run. Lists are newest-first,
// so this window is enough to detect the already-synced backlog and early-stop.
const RECENT_KNOWN_WINDOW = 1500;

export interface SyncBaseline {
  // Known source ids for dedup + harvester early-stop. Full set on a full sync,
  // a bounded recent window on an incremental sync.
  knownIds: Set<string>;
  // True library size for this account (UI + watermark).
  total: number;
  // Whether this run is a full walk (first sync or forced).
  full: boolean;
}

// Saves owned by this account, plus unattributed rows for its source: rows
// that predate multi-account or arrived via the extension have no account_id,
// and treating them as unknown would only make the harvester walk further.
function baselineWhere(account: ConnectedAccount) {
  return and(
    eq(saves.source, account.source),
    or(eq(saves.accountId, account.id), isNull(saves.accountId)),
  );
}

// Decide full vs incremental and load the right baseline. A full walk happens on
// the very first sync (no prior full sync recorded) or when explicitly forced.
export async function loadSyncBaseline(
  account: ConnectedAccount,
  forceFull: boolean,
): Promise<SyncBaseline> {
  const db = await getDb();
  const cfg = await getAccountSync(account.id);
  const full = forceFull || cfg.lastFullSyncAt === null;
  if (full) {
    const rows = await db
      .select({ sourceId: saves.sourceId })
      .from(saves)
      .where(baselineWhere(account));
    const knownIds = new Set<string>(rows.map((r) => r.sourceId));
    return { knownIds, total: knownIds.size, full: true };
  }
  const rows = await db
    .select({ sourceId: saves.sourceId })
    .from(saves)
    .where(baselineWhere(account))
    .orderBy(desc(saves.savedAt))
    .limit(RECENT_KNOWN_WINDOW);
  const knownIds = new Set<string>(rows.map((r) => r.sourceId));
  const totalRow = await db
    .select({ c: count() })
    .from(saves)
    .where(baselineWhere(account))
    .get();
  return { knownIds, total: totalRow?.c ?? knownIds.size, full: false };
}

// Persist the incremental cursor after a successful run. Only advance
// `lastFullSyncAt` on a full walk so the next run can go incremental.
export async function persistWatermark(
  accountId: string,
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
  await patchAccountSync(accountId, patch);
  return lastSyncedAt;
}
