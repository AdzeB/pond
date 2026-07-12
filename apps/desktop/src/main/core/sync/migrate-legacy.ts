import {
  DEFAULT_SOURCE_SYNC_PREFS,
  SOURCES,
  type Source,
  type SourceSyncPrefs,
  saves,
} from "@pond/schema/db";
import { and, eq, isNull } from "drizzle-orm";
import log from "electron-log/main.js";
import { getDb } from "../../db";
import { getPrefs, setPrefs } from "../prefs";
import {
  type ImportableCookie,
  listCookiesForSource,
  writePartitionCookies,
} from "../refresh/scrape-window";
import {
  createAccount,
  LEGACY_PARTITION,
  listAccountsForSource,
  partitionForAccount,
} from "./accounts";

// One-time upgrade from the single-account-per-source model: each legacy
// `sync.handles[source]` / `sync.sources[source]` entry becomes one
// ConnectedAccount that inherits the watermark, gets the source's cookies
// copied from the shared legacy partition into its own jar, and owns every
// unattributed save for that source. Legacy maps are drained afterwards, so
// re-running is a no-op. Runs per library (prefs are per-pond).
export async function migrateLegacySyncPrefs(): Promise<void> {
  const prefs = await getPrefs();
  const handles = prefs.sync.handles ?? {};
  const legacySync = prefs.sync.sources ?? {};

  const legacySources = SOURCES.filter(
    (source) =>
      source !== "local" &&
      source !== "web" &&
      (handles[source] !== undefined || legacySync[source] !== undefined),
  );
  if (legacySources.length === 0) return;

  for (const source of legacySources) {
    try {
      await migrateSource(
        source,
        handles[source] ?? null,
        legacySync[source] ?? null,
      );
    } catch (err) {
      log.warn("[pond accounts] legacy migration failed for", source, err);
    }
  }

  // Drain the legacy maps (a nested prefs patch replaces the whole record) so
  // the migration never runs twice and new code never reads them.
  await setPrefs({ sync: { handles: {}, sources: {} } });
  log.info(
    "[pond accounts] legacy sync prefs migrated:",
    legacySources.join(", "),
  );
}

async function migrateSource(
  source: Source,
  handle: string | null,
  sync: SourceSyncPrefs | null,
): Promise<void> {
  // A session import may already have created an account for this source
  // (match-or-create ran before the migration); fold the legacy state into
  // the oldest account instead of minting a duplicate.
  const existing = (await listAccountsForSource(source))[0];
  const account =
    existing ??
    (await createAccount({
      source,
      handle,
      sync: { ...DEFAULT_SOURCE_SYNC_PREFS, ...sync },
    }));

  if (!existing) {
    await copyLegacyCookies(source, partitionForAccount(account.id));
  }

  // Attribute this source's pre-multi-account saves to the migrated account;
  // local/web saves and future accounts' rows are untouched.
  const db = await getDb();
  db.update(saves)
    .set({ accountId: account.id })
    .where(and(eq(saves.source, source), isNull(saves.accountId)))
    .run();
}

// Copy the source's domain-filtered cookies out of the shared legacy jar so
// the migrated account stays signed in without a fresh browser push. The
// legacy jar is left intact for any not-yet-migrated library on this machine.
async function copyLegacyCookies(
  source: Source,
  partition: string,
): Promise<void> {
  const cookies = await listCookiesForSource(source, LEGACY_PARTITION);
  if (cookies.length === 0) return;
  const importable: ImportableCookie[] = cookies.map((c) => ({
    name: c.name,
    value: c.value,
    domain: c.domain ?? "",
    path: c.path,
    secure: c.secure,
    httpOnly: c.httpOnly,
    sameSite: c.sameSite,
    expirationDate: c.expirationDate ?? null,
    hostOnly: c.hostOnly,
  }));
  const { written, skipped } = await writePartitionCookies({
    cookies: importable,
    partition,
  });
  log.info(
    `[pond accounts] copied ${written} legacy ${source} cookies (${skipped} skipped)`,
  );
}
