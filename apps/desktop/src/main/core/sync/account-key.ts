import { type Source, saves } from "@pond/schema/db";
import { eq } from "drizzle-orm";
import log from "electron-log/main.js";
import { getDb } from "../../db";
import { extractorFor } from "../pipeline/extractors";
import { getPrefs, setPrefs } from "../prefs";
import { probeUserHandle, readStoredHandle } from "../refresh/scrape-window";

export async function inferAccountKey(source: Source): Promise<string | null> {
  const db = await getDb();
  const rows = await db
    .select({ url: saves.url, author: saves.author })
    .from(saves)
    .where(eq(saves.source, source))
    .limit(50);
  // `author` is the saved item's creator, not the account owner. Only trust it
  // for sources without a path-based handle parser (e.g. cosmos); otherwise a
  // favorited block/video would resolve to its creator's name (e.g. arena
  // blocks → "Stephanie Zabala") and poison the user's account key.
  const hasPathParser = Boolean(extractorFor(source)?.handleFromPath);
  let result: string | null = null;
  for (const row of rows) {
    const handle =
      handleFromUrl(source, row.url) ??
      (hasPathParser ? null : (row.author ?? null));
    if (handle) {
      result = handle.replace(/^@/, "");
      break;
    }
  }
  return result;
}

// A cached handle is only trustworthy if it still passes the source's own
// path validator (e.g. arena rejects reserved roots like "block"). Earlier
// buggy runs persisted bad handles; this stops us short-circuiting on them.
function isCachedHandleValid(source: Source, handle: string): boolean {
  const fn = extractorFor(source)?.handleFromPath;
  if (!fn) return true;
  return fn([handle]) != null;
}

// Resolve the user's handle (cosmos/arena/tiktok): cache → DB inference → hidden-window probe.
export async function resolveAccountKey(
  source: Source,
): Promise<string | null> {
  const cached = await readStoredHandle(source);
  if (cached && isCachedHandleValid(source, cached)) return cached;
  if (cached) {
    log.info(
      `[pond sync:${source}] ignoring invalid cached handle "${cached}"; re-resolving`,
    );
  }

  const inferred = await inferAccountKey(source);
  if (inferred) {
    await persistAccountKey(source, inferred);
    return inferred;
  }

  log.info(`[pond sync:${source}] probing hidden window for handle`);
  const probed = await probeUserHandle(source);
  if (probed) {
    log.info(`[pond sync:${source}] probed handle`, probed);
    await persistAccountKey(source, probed);
    return probed;
  }
  return null;
}

async function persistAccountKey(
  source: Source,
  handle: string,
): Promise<void> {
  try {
    const prefs = await getPrefs();
    const nextHandles = { ...(prefs.sync.handles ?? {}), [source]: handle };
    await setPrefs({ sync: { handles: nextHandles } });
  } catch (err) {
    log.warn(`[pond sync:${source}] failed to cache handle`, err);
  }
}

// Per-source handle parsing lives on each extractor (handleFromPath).
function handleFromUrl(source: Source, url: string): string | null {
  try {
    const segments = new URL(url).pathname.split("/").filter(Boolean);
    return extractorFor(source)?.handleFromPath?.(segments) ?? null;
  } catch {
    return null;
  }
}
