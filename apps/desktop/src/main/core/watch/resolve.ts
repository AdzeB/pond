import type { Source, WatchKind } from "@pond/schema/db";
import log from "electron-log/main.js";

// Resolves what the user typed into the watch-add field — a bare handle or a
// pasted URL — into a concrete watch target: which kind of thing to follow
// and the slug that identifies it. Resolved once at add time and stored on
// the watch, so runners never have to guess.

export interface WatchTarget {
  kind: WatchKind;
  /** Stored slug: handle, playlist/list id, `user/board`, `user/cluster`… */
  handle: string;
  /** Short human form for the confirm chip ("@mkbhd", "sulley/blocks"…). */
  display: string;
}

const ARENA_PROBE_TIMEOUT_MS = 8_000;

// Profile-page tabs that show up after a user slug but don't name a channel.
const ARENA_USER_TABS = new Set([
  "channels",
  "blocks",
  "index",
  "followers",
  "following",
  "all",
]);

// First path segments that are never a Pinterest username.
const PINTEREST_RESERVED = new Set([
  "pin",
  "search",
  "ideas",
  "today",
  "settings",
  "business",
  "news_hub",
]);

// First path segments that are never a Cosmos username.
const COSMOS_RESERVED = new Set([
  "e",
  "discover",
  "explore",
  "library",
  "login",
  "signup",
  "sign-in",
  "onboarding",
]);

function parseUrl(input: string): URL | null {
  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(input)
    ? input
    : /^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(input)
      ? `https://${input}`
      : null;
  if (!candidate) return null;
  try {
    return new URL(candidate);
  } catch {
    return null;
  }
}

function segmentsOf(url: URL): string[] {
  return url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
}

function hostIs(url: URL, ...domains: string[]): boolean {
  const host = url.hostname.toLowerCase();
  return domains.some((d) => host === d || host.endsWith(`.${d}`));
}

function cleanHandle(input: string): string {
  return input.trim().replace(/^@/, "");
}

function target(
  kind: WatchKind,
  handle: string,
  display?: string,
): WatchTarget {
  return { kind, handle, display: display ?? handle };
}

export async function resolveWatchTarget(
  source: Source,
  rawInput: string,
): Promise<WatchTarget | null> {
  const input = rawInput.trim();
  if (!input) return null;
  const url = parseUrl(input);

  switch (source) {
    case "arena":
      return resolveArena(input, url);
    case "youtube":
      return resolveYoutube(input, url);
    case "tiktok":
      return resolveSimpleUser(input, url, ["tiktok.com"]);
    case "instagram":
      return resolveSimpleUser(input, url, ["instagram.com"]);
    case "twitter":
      return resolveTwitter(input, url);
    case "pinterest":
      return resolvePinterest(input, url);
    case "cosmos":
      return resolveCosmos(input, url);
    default:
      return null;
  }
}

// ── Are.na ──────────────────────────────────────────────────────────────────

async function resolveArena(
  input: string,
  url: URL | null,
): Promise<WatchTarget | null> {
  if (url) {
    if (!hostIs(url, "are.na")) return null;
    const segs = segmentsOf(url);
    const first = segs[0];
    if (!first) return null;
    const second = segs[1];
    if (second && !ARENA_USER_TABS.has(second.toLowerCase())) {
      // are.na/{user}/{channel-slug}: the channel slug alone identifies it.
      return target("channel", second, `${first}/${second}`);
    }
    // Single segment (or a profile tab): a user or a group page — probe.
    return probeArena(first, ["user", "group", "channel"]);
  }
  const slug = cleanHandle(input);
  if (!/^[\w.-]+$/.test(slug)) return null;
  // Bare slugs are usually channels; a user or group name also fits here, so
  // pin the kind now instead of guessing on every check.
  return probeArena(slug, ["channel", "user", "group"]);
}

async function probeArena(
  slug: string,
  order: readonly [
    "channel" | "user" | "group",
    ...Array<"channel" | "user" | "group">,
  ],
): Promise<WatchTarget | null> {
  const paths: Record<"channel" | "user" | "group", string> = {
    channel: "channels",
    user: "users",
    group: "groups",
  };
  for (const kind of order) {
    try {
      const res = await fetch(
        `https://api.are.na/v3/${paths[kind]}/${encodeURIComponent(slug)}`,
        {
          credentials: "omit",
          headers: { accept: "application/json" },
          signal: AbortSignal.timeout(ARENA_PROBE_TIMEOUT_MS),
        },
      );
      if (res.ok) return target(kind, slug);
      if (res.status !== 404) {
        // Rate limit / outage: don't block the add — assume the likeliest
        // kind and let the first check sort it out.
        return target(order[0], slug);
      }
    } catch (err) {
      log.warn("[pond watch:resolve] arena probe failed", slug, err);
      return target(order[0], slug);
    }
  }
  return null;
}

// ── YouTube ─────────────────────────────────────────────────────────────────

function resolveYoutube(input: string, url: URL | null): WatchTarget | null {
  if (url) {
    if (!hostIs(url, "youtube.com", "youtu.be")) return null;
    const list = url.searchParams.get("list");
    if (list) return target("playlist", list);
    const segs = segmentsOf(url);
    const first = segs[0];
    const second = segs[1];
    if (!first) return null;
    if (first.startsWith("@")) {
      const handle = first.slice(1);
      const tab = second?.toLowerCase();
      if (tab === "shorts" || tab === "streams") {
        return target("channel", `${handle}/${tab}`, `@${handle} ${tab}`);
      }
      return target("channel", handle, `@${handle}`);
    }
    if ((first === "channel" || first === "c" || first === "user") && second) {
      return target("channel", second, second);
    }
    return null;
  }
  const handle = cleanHandle(input);
  if (!/^[\w.-]+(\/(shorts|streams))?$/i.test(handle)) return null;
  return target("channel", handle, `@${handle}`);
}

// ── TikTok / Instagram ──────────────────────────────────────────────────────

function resolveSimpleUser(
  input: string,
  url: URL | null,
  domains: string[],
): WatchTarget | null {
  if (url) {
    if (!hostIs(url, ...domains)) return null;
    const first = segmentsOf(url)[0];
    if (!first) return null;
    const handle = cleanHandle(first);
    return /^[\w.-]+$/.test(handle)
      ? target("user", handle, `@${handle}`)
      : null;
  }
  const handle = cleanHandle(input);
  return /^[\w.-]+$/.test(handle) ? target("user", handle, `@${handle}`) : null;
}

// ── Twitter ─────────────────────────────────────────────────────────────────

function resolveTwitter(input: string, url: URL | null): WatchTarget | null {
  if (url) {
    if (!hostIs(url, "x.com", "twitter.com")) return null;
    const segs = segmentsOf(url);
    const listId = segs[2];
    if (
      segs[0] === "i" &&
      segs[1] === "lists" &&
      listId &&
      /^\d+$/.test(listId)
    ) {
      return target("list", listId);
    }
    const first = segs[0];
    if (!first || first === "i") return null;
    const handle = cleanHandle(first);
    return /^\w+$/.test(handle) ? target("user", handle, `@${handle}`) : null;
  }
  const handle = cleanHandle(input);
  return /^\w+$/.test(handle) ? target("user", handle, `@${handle}`) : null;
}

// ── Pinterest ───────────────────────────────────────────────────────────────

function resolvePinterest(input: string, url: URL | null): WatchTarget | null {
  if (url) {
    if (!hostIs(url, "pinterest.com") && !hostIs(url, "pinterest.co.uk")) {
      return null;
    }
    const segs = segmentsOf(url);
    const first = segs[0];
    if (!first || PINTEREST_RESERVED.has(first.toLowerCase())) return null;
    const board = segs[1];
    if (board && !board.startsWith("_") && board !== "feed.rss") {
      return target("board", `${first}/${board}`);
    }
    return target("user", first, `@${first}`);
  }
  const slug = cleanHandle(input);
  const m = /^([\w.-]+)(?:\/([\w-]+))?$/.exec(slug);
  const user = m?.[1];
  if (!user) return null;
  return m[2]
    ? target("board", `${user}/${m[2]}`)
    : target("user", user, `@${user}`);
}

// ── Cosmos ──────────────────────────────────────────────────────────────────

function resolveCosmos(input: string, url: URL | null): WatchTarget | null {
  if (url) {
    if (!hostIs(url, "cosmos.so")) return null;
    const segs = segmentsOf(url);
    const first = segs[0];
    if (!first || COSMOS_RESERVED.has(first.toLowerCase())) return null;
    return segs[1]
      ? target("cluster", `${first}/${segs[1]}`)
      : target("user", first, `@${first}`);
  }
  const slug = cleanHandle(input);
  const m = /^([\w.-]+)(?:\/([\w-]+))?$/.exec(slug);
  const user = m?.[1];
  if (!user) return null;
  return m[2]
    ? target("cluster", `${user}/${m[2]}`)
    : target("user", user, `@${user}`);
}
