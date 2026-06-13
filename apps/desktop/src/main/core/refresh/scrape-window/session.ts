import type { Source } from "@pond/schema/db";
import { type Cookie, session, shell } from "electron";
import log from "electron-log/main.js";
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

// Opens the hidden window logged in via the partition cookies and reads
// the user's own handle from the rendered DOM. We pick the handle off
// the profile link in the top nav: it's the one stable, public-facing
// identifier every social site exposes once you're authenticated.
//
// Returns `null` if the session isn't authenticated or the DOM probe
// doesn't match (site redesign, sign-out, etc.). The caller should
// surface that as `auth_required`.
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

function buildProbeExpression(source: Source): string {
  // Each site exposes a profile/avatar link in the top nav pointing at
  // `/<handle>`. We pick the first link whose href is a single-segment
  // path on the site's own host. The expressions return the trimmed
  // handle string or the empty string.
  switch (source) {
    case "cosmos":
      return `(() => {
        try {
          const host = location.hostname.replace(/^www\\./, '');
          const links = Array.from(document.querySelectorAll('a[href^="/"]'));
          for (const a of links) {
            const href = a.getAttribute('href') || '';
            const m = href.match(/^\\/([A-Za-z0-9_-]{2,40})(\\?.*)?$/);
            if (!m) continue;
            const handle = m[1];
            // Filter obvious non-user paths.
            if (['login','signup','signin','about','pricing','settings','explore','search','feed','home','clusters'].includes(handle.toLowerCase())) continue;
            // Prefer a link in the top nav / header.
            const inNav = a.closest('header, nav, [role="navigation"]');
            if (inNav) return handle;
          }
          // Fallback: any plausible match.
          for (const a of links) {
            const href = a.getAttribute('href') || '';
            const m = href.match(/^\\/([A-Za-z0-9_-]{2,40})(\\?.*)?$/);
            if (m && !['login','signup','signin','about','pricing','settings','explore','search','feed','home','clusters'].includes(m[1].toLowerCase())) return m[1];
          }
          void host;
          return '';
        } catch { return ''; }
      })()`;
    case "arena":
      return `(() => {
        try {
          // Are.na's user nav has a "Profile" link to /<slug>.
          const links = Array.from(document.querySelectorAll('a[href^="/"]'));
          for (const a of links) {
            const href = a.getAttribute('href') || '';
            const m = href.match(/^\\/([a-z0-9-]{2,60})(\\/?$|\\?.*$)/i);
            if (!m) continue;
            const slug = m[1];
            if (['about','blog','log-in','login','sign-up','signup','channels','search','explore','pricing','jobs','privacy','terms','team','press','help','support','settings'].includes(slug.toLowerCase())) continue;
            return slug;
          }
          return '';
        } catch { return ''; }
      })()`;
    default:
      return `''`;
  }
}

function isAuthCookie(source: Source, cookie: Cookie): boolean {
  const name = cookie.name;
  switch (source) {
    case "twitter":
      return name === "auth_token";
    case "instagram":
      return name === "sessionid";
    case "tiktok":
      return name === "sessionid" || name === "sid_tt";
    case "pinterest":
      return name === "_pinterest_sess" || name === "_auth";
    case "youtube":
      return (
        name === "LOGIN_INFO" ||
        name === "SID" ||
        name === "__Secure-1PSID" ||
        name === "__Secure-3PSID"
      );
    case "arena":
      // are.na's web app is now a Next.js frontend that stores auth in an
      // iron-session cookie (`sander-iron-session`). The legacy Rails names
      // (`_arena_session`, `remember_user_token`) are kept for compatibility.
      return (
        name === "sander-iron-session" ||
        name === "_arena_session" ||
        name === "remember_user_token" ||
        name === "cf_clearance" // not auth on its own; tolerated so the
        // first sync probes; gets refined below if it's the only one.
      );
    case "cosmos":
      // cosmos.so uses Supabase/NextAuth-style session tokens. Their cookie
      // name has changed before, so accept the standard auth-token shapes
      // rather than pinning to one literal.
      return (
        /^sb-[a-z0-9-]+-auth-token(\.\d+)?$/.test(name) ||
        name === "__Secure-next-auth.session-token" ||
        name === "next-auth.session-token" ||
        name === "cosmos.session-token"
      );
    case "local":
      return false;
  }
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

export function primaryDomainForSource(source: Source): string | null {
  switch (source) {
    case "twitter":
      return ".x.com";
    case "instagram":
      return ".instagram.com";
    case "cosmos":
      return ".cosmos.so";
    case "tiktok":
      return ".tiktok.com";
    case "pinterest":
      return ".pinterest.com";
    case "arena":
      return ".are.na";
    case "youtube":
      return ".youtube.com";
    case "local":
      return null;
  }
}
