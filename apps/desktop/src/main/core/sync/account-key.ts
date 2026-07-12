import { type ConnectedAccount, type Source, saves } from "@pond/schema/db";
import { eq } from "drizzle-orm";
import log from "electron-log/main.js";
import { getDb } from "../../db";
import { extractorFor } from "../pipeline/extractors";
import { probeUserHandle } from "../refresh/scrape-window";
import {
  listAccountsForSource,
  normalizeHandle,
  partitionForAccount,
  patchAccount,
} from "./accounts";

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

// Resolve the account's handle (cosmos/arena/tiktok): registry cache → DB
// inference (only safe with a single account) → hidden-window probe on the
// account's own partition. A resolved handle is persisted onto the account.
export async function resolveAccountHandle(
  account: ConnectedAccount,
): Promise<string | null> {
  const { source } = account;
  const cached = normalizeHandle(account.handle);
  if (cached && isCachedHandleValid(source, cached)) return cached;
  if (cached) {
    log.info(
      `[pond sync:${source}] ignoring invalid cached handle "${cached}"; re-resolving`,
    );
  }

  // DB inference can't tell accounts apart, so only trust it when this is the
  // source's sole account.
  const siblings = await listAccountsForSource(source);
  if (siblings.length === 1) {
    const inferred = await inferAccountKey(source);
    if (inferred) {
      await persistAccountHandle(account, inferred);
      return inferred;
    }
  }

  log.info(`[pond sync:${source}] probing hidden window for handle`);
  const probed = await probeUserHandle(source, partitionForAccount(account.id));
  if (probed) {
    log.info(`[pond sync:${source}] probed handle`, probed);
    await persistAccountHandle(account, probed);
    return probed;
  }
  return null;
}

// Opportunistic handle learn for sources that don't need one to sync
// (twitter/instagram/pinterest/youtube): probe the signed-in page directly.
// DB inference is deliberately skipped — bookmark-style saves carry the
// *author's* handle, which would poison the account. Non-fatal by design;
// the handle feeds session matching and the Sources page profile picture.
export async function ensureAccountHandle(
  account: ConnectedAccount,
): Promise<void> {
  if (normalizeHandle(account.handle)) return;
  if (!extractorFor(account.source)?.probeExpression) return;
  try {
    const probed = await probeUserHandle(
      account.source,
      partitionForAccount(account.id),
    );
    if (!probed) return;
    log.info(`[pond sync:${account.source}] probed handle`, probed);
    await persistAccountHandle(account, probed);
  } catch (err) {
    log.warn(`[pond sync:${account.source}] handle probe failed`, err);
  }
}

async function persistAccountHandle(
  account: ConnectedAccount,
  handle: string,
): Promise<void> {
  try {
    // A new handle invalidates the cached profile picture; clearing the
    // stamps makes the next avatar sweep re-resolve under it.
    await patchAccount(account.id, {
      handle,
      avatarUrl: null,
      avatarCheckedAt: null,
    });
  } catch (err) {
    log.warn(`[pond sync:${account.source}] failed to cache handle`, err);
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
