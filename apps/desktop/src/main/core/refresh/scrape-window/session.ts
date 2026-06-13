import type { Source } from "@pond/schema/db";
import { type Cookie, session, shell } from "electron";
import log from "electron-log/main.js";
import { extractorFor } from "../../pipeline/extractors";
import { getPrefs, setPrefs } from "../../prefs";
import { homeUrlForSource } from "../sources";
import { HARVEST_TIMEOUT_MS, NAV_TIMEOUT_MS, PARTITION } from "./constants";
import { looksLikeAuthWall, navigateWithTimeout } from "./navigation";
import { leaseWindow } from "./pool";
import { sleep } from "./util";

export type SignInMode = "external";

export async function signInToSource(
  source: Source,
): Promise<{ ok: boolean; mode: SignInMode }> {
  const url = homeUrlForSource(source);
  try {
    await shell.openExternal(url);
    log.info("[pond refresh:signin] opened external browser for", source, url);
    return { ok: true, mode: "external" };
  } catch (err) {
    log.warn("[pond refresh:signin] openExternal failed", source, err);
    return { ok: false, mode: "external" };
  }
}

export async function isSourceConnected(source: Source): Promise<boolean> {
  const cookies = await listCookiesForSource(source);
  return cookies.some((c) => isAuthCookie(source, c));
}

export async function writePartitionCookies(args: {
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path?: string;
    secure?: boolean;
    httpOnly?: boolean;
    sameSite?: "unspecified" | "no_restriction" | "lax" | "strict";
    expirationDate?: number | null;
    hostOnly?: boolean;
  }>;
}): Promise<{ written: number; skipped: number }> {
  const persistent = session.fromPartition(PARTITION);
  let written = 0;
  let skipped = 0;
  for (const c of args.cookies) {
    const hostForUrl = c.domain.replace(/^\./, "");
    const url = `${c.secure === false ? "http" : "https"}://${hostForUrl}${c.path ?? "/"}`;
    try {
      await persistent.cookies.set({
        url,
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path ?? "/",
        secure: c.secure,
        httpOnly: c.httpOnly,
        sameSite: c.sameSite ?? "unspecified",
        expirationDate: c.expirationDate ?? undefined,
      });
      written += 1;
    } catch (err) {
      skipped += 1;
      log.warn(
        "[pond refresh:cookies] set failed",
        c.name,
        c.domain,
        err instanceof Error ? err.message : err,
      );
    }
  }
  return { written, skipped };
}

export async function readStoredHandle(source: Source): Promise<string | null> {
  try {
    const prefs = await getPrefs();
    const raw = prefs.sync.handles?.[source];
    if (typeof raw !== "string") return null;
    const trimmed = raw.trim().replace(/^@/, "");
    return trimmed.length > 0 ? trimmed : null;
  } catch (err) {
    log.warn("[pond refresh:signin] readStoredHandle failed", source, err);
    return null;
  }
}

async function _writeStoredHandle(
  source: Source,
  handle: string,
): Promise<void> {
  const trimmed = handle.trim().replace(/^@/, "");
  if (!trimmed) return;
  try {
    const prefs = await getPrefs();
    const nextHandles = { ...(prefs.sync.handles ?? {}), [source]: trimmed };
    await setPrefs({ sync: { handles: nextHandles } });
  } catch (err) {
    log.warn("[pond refresh:signin] writeStoredHandle failed", source, err);
  }
}

// Probe the hidden window for the user's handle off the top-nav profile link; null when unauth.
export async function probeUserHandle(source: Source): Promise<string | null> {
  const lease = await leaseWindow(source);
  try {
    const url = homeUrlForSource(source);
    const navOk = await navigateWithTimeout(lease.win, url, NAV_TIMEOUT_MS);
    if (!navOk) {
      log.warn("[pond refresh:probe] navigate failed", source, url);
      return null;
    }
    const current = lease.win.webContents.getURL();
    if (looksLikeAuthWall(current)) {
      log.info("[pond refresh:probe] auth wall hit", source, current);
      return null;
    }

    const expr = buildProbeExpression(source);
    const raw = await Promise.race([
      lease.win.webContents.executeJavaScript(expr, true),
      sleep(HARVEST_TIMEOUT_MS).then(() => "__pond_probe_timeout__"),
    ]);
    if (typeof raw !== "string" || raw === "__pond_probe_timeout__") {
      log.warn("[pond refresh:probe] no handle in DOM", source);
      return null;
    }
    const handle = raw.trim().replace(/^@/, "");
    return handle.length > 0 ? handle : null;
  } catch (err) {
    log.warn("[pond refresh:probe] unexpected error", source, err);
    return null;
  } finally {
    lease.release();
  }
}

// The in-page handle probe (cosmos/arena) lives on each extractor.
function buildProbeExpression(source: Source): string {
  return extractorFor(source)?.probeExpression ?? "''";
}

// Per-source auth-cookie detection lives on each extractor.
function isAuthCookie(source: Source, cookie: Cookie): boolean {
  return extractorFor(source)?.authCookies(cookie.name) ?? false;
}

async function listCookiesForSource(source: Source): Promise<Cookie[]> {
  const persistent = session.fromPartition(PARTITION);
  const domain = primaryDomainForSource(source);
  if (!domain) return [];
  try {
    return await persistent.cookies.get({ domain });
  } catch (err) {
    log.warn("[pond refresh:window] cookies.get failed", domain, err);
    return [];
  }
}

// The cookie domain that gates a source's scraping lives on each extractor.
export function primaryDomainForSource(source: Source): string | null {
  return extractorFor(source)?.cookieDomain ?? null;
}
