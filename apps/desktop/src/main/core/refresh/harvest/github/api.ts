import type { Capture } from "@pond/schema/raw";
import { session } from "electron";
import log from "electron-log/main.js";
import { partitionForIngest } from "../../../sync/accounts";
import { PARTITION } from "../../harvest-window/constants";
import type {
  ListEntry,
  ListHarvestArgs,
  ListHarvestResult,
} from "../list-types";
import {
  captureFromRepo,
  RepoSchema,
  StarPageSchema,
  starEntry,
} from "./normalize";

const API = "https://api.github.com";
const PAGE_SIZE = 100;
const MAX_PAGES = 100;
const USER_AGENT = "Pond";

type ApiResult =
  | { ok: true; res: Response }
  | {
      ok: false;
      reason: "not_found" | "rate_limited" | "error";
      retryAfterSec?: number;
    };

/** One GitHub API request, so tests can answer for the network. */
export type GithubGet = (url: string, accept: string) => Promise<Response>;

interface SessionCookie {
  name: string;
  value: string;
}

const networkGet: GithubGet = (url, accept) =>
  fetch(url, {
    headers: {
      accept,
      "user-agent": USER_AGENT,
      "x-github-api-version": "2022-11-28",
    },
  });

/** github.com sets `dotcom_user` beside `user_session`, and `logged_in=yes` only while signed in. */
export function loginFromCookies(
  cookies: readonly SessionCookie[],
): string | null {
  const signedIn = cookies.some(
    (cookie) => cookie.name === "logged_in" && cookie.value === "yes",
  );
  const login = cookies.find((cookie) => cookie.name === "dotcom_user")?.value;
  return signedIn && login ? decodeURIComponent(login) : null;
}

export async function probeGithubHandle(
  partition: string = PARTITION,
): Promise<string | null> {
  try {
    const cookies = await session
      .fromPartition(partition)
      .cookies.get({ url: "https://github.com" });
    return loginFromCookies(cookies);
  } catch (err) {
    log.warn("[pond github-api] cookie read failed", err);
    return null;
  }
}

export async function harvestGithubStars(
  args: ListHarvestArgs,
  partition?: string,
): Promise<ListHarvestResult> {
  const jar = partition ?? (await partitionForIngest("github"));
  const login = await probeGithubHandle(jar);
  if (!login) return { ok: false, reason: "auth_required" };
  return readGithubStars(args, login);
}

/** Reads the public starred list newest first; stars are public, so the API needs no token. */
export async function readGithubStars(
  args: ListHarvestArgs,
  login: string,
  get: GithubGet = networkGet,
): Promise<ListHarvestResult> {
  const known = new Set(args.knownIds);
  const earlyStop = args.earlyStop !== false && known.size > 0;
  const since = args.savedSince ? Date.parse(args.savedSince) : Number.NaN;
  const entries: ListEntry[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = `${API}/users/${encodeURIComponent(login)}/starred?per_page=${PAGE_SIZE}&page=${page}`;
    const result = await githubApi(
      get,
      url,
      "application/vnd.github.star+json",
    );
    if (!result.ok) {
      if (result.reason === "rate_limited") {
        const out: ListHarvestResult = { ok: false, reason: "rate_limited" };
        if (result.retryAfterSec) out.retryAfterSec = result.retryAfterSec;
        return out;
      }
      if (page === 1) {
        return {
          ok: false,
          reason: result.reason === "not_found" ? "auth_required" : "unknown",
        };
      }
      return { ok: true, entries, reachedEnd: false, seen: entries.length };
    }
    const stars = StarPageSchema.parse(await result.res.json().catch(() => []));
    let fresh = 0;
    for (const star of stars) {
      if (!star) continue;
      const entry = starEntry(star);
      const savedAt = entry.savedAt ? Date.parse(entry.savedAt) : Number.NaN;
      if (savedAt < since) {
        return { ok: true, entries, reachedEnd: true, seen: entries.length };
      }
      if (!known.has(entry.sourceId)) fresh += 1;
      entries.push(entry);
    }
    if (earlyStop && stars.length > 0 && fresh === 0) {
      return { ok: true, entries, reachedEnd: true, seen: entries.length };
    }
    if (stars.length < PAGE_SIZE) {
      log.info(
        `[pond github-api] stars login=${login} entries=${entries.length}`,
      );
      return {
        ok: true,
        entries,
        reachedEnd: true,
        seen: entries.length,
        complete: true,
      };
    }
    await sleep(250);
  }
  return { ok: true, entries, reachedEnd: false, seen: entries.length };
}

export type GithubCaptureResult =
  | { ok: true; capture: Capture }
  | { ok: false; reason: "not_found" | "rate_limited" | "error" };

export async function fetchGithubCapture(
  args: { sourceId: string },
  get: GithubGet = networkGet,
): Promise<GithubCaptureResult> {
  const repoPath = args.sourceId
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  const repoResult = await githubApi(
    get,
    `${API}/repos/${repoPath}`,
    "application/vnd.github+json",
  );
  if (!repoResult.ok) return { ok: false, reason: repoResult.reason };
  const parsed = RepoSchema.safeParse(
    await repoResult.res.json().catch(() => null),
  );
  if (!parsed.success) return { ok: false, reason: "error" };

  let readme: string | null = null;
  const readmeResult = await githubApi(
    get,
    `${API}/repos/${repoPath}/readme`,
    "application/vnd.github.raw",
  );
  if (readmeResult.ok) readme = await readmeResult.res.text().catch(() => null);
  return { ok: true, capture: captureFromRepo(parsed.data, readme) };
}

async function githubApi(
  get: GithubGet,
  url: string,
  accept: string,
): Promise<ApiResult> {
  let res: Response;
  try {
    res = await get(url, accept);
  } catch (err) {
    log.warn("[pond github-api] fetch threw", url, err);
    return { ok: false, reason: "error" };
  }
  if (res.ok) return { ok: true, res };
  if (res.status === 404) return { ok: false, reason: "not_found" };
  if (
    res.status === 429 ||
    (res.status === 403 && res.headers.get("x-ratelimit-remaining") === "0")
  ) {
    const reset = Number(res.headers.get("x-ratelimit-reset"));
    const retryAfter = Number(res.headers.get("retry-after"));
    const retryAfterSec =
      Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter
        : Number.isFinite(reset) && reset > 0
          ? Math.max(1, Math.round(reset - Date.now() / 1000))
          : undefined;
    return retryAfterSec
      ? { ok: false, reason: "rate_limited", retryAfterSec }
      : { ok: false, reason: "rate_limited" };
  }
  log.warn("[pond github-api] request failed", url, res.status);
  return { ok: false, reason: "error" };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
