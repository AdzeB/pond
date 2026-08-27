import {
  capture,
  installInterceptor,
  type RequestLens,
} from "@/utils/intercept";

const YOUTUBEI_RE = /\/youtubei\/v1\//i;
const PLAYLIST_EDIT_HINT_RE =
  /(edit_playlist|add_to_watch_later|playlist\/(add|create|edit)|share\/get_share_panel)/i;
const LIKE_RE = /\/youtubei\/v1\/like\/like\b/i;
const VIDEO_ID_RE = /^[\w-]{11}$/;

function readJson(text: string | null): any {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function collectAddedVideoIds(node: unknown, out: Set<string>): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const x of node) collectAddedVideoIds(x, out);
    return;
  }
  const obj = node as Record<string, unknown>;
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (
      (k === "addedVideoId" || k === "videoId") &&
      typeof v === "string" &&
      VIDEO_ID_RE.test(v)
    ) {
      out.add(v);
    } else if (v && typeof v === "object") {
      collectAddedVideoIds(v, out);
    }
  }
}

function findPlaylistIds(node: unknown, out: Set<string>): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const x of node) findPlaylistIds(x, out);
    return;
  }
  const obj = node as Record<string, unknown>;
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (k === "playlistId" && typeof v === "string" && v.length > 0) {
      out.add(v);
    } else if (v && typeof v === "object") {
      findPlaylistIds(v, out);
    }
  }
}

function anyStringMatches(
  node: unknown,
  predicate: (s: string) => boolean,
): boolean {
  if (typeof node === "string") return predicate(node);
  if (!node || typeof node !== "object") return false;
  if (Array.isArray(node)) {
    for (const x of node) if (anyStringMatches(x, predicate)) return true;
    return false;
  }
  for (const v of Object.values(node)) {
    if (anyStringMatches(v, predicate)) return true;
  }
  return false;
}

function collectEditedVideoIds(node: unknown, out: Set<string>): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const x of node) collectEditedVideoIds(x, out);
    return;
  }
  const obj = node as Record<string, unknown>;
  const added = obj.playlistEditVideoAddedResultData as
    | Record<string, unknown>
    | undefined;
  if (added && typeof added.videoId === "string") {
    out.add(added.videoId);
  }
  for (const v of Object.values(obj)) {
    if (v && typeof v === "object") collectEditedVideoIds(v, out);
  }
}

function extractLikeVideoId(body: string | null): string | null {
  const json = readJson(body);
  const id =
    json?.target?.videoId ?? json?.videoId ?? json?.params?.videoId ?? null;
  return id && VIDEO_ID_RE.test(String(id)) ? String(id) : null;
}

function classifyYoutubeiPost(
  url: string,
  requestBody: string | null,
  responseBody: string | null,
): Set<string> {
  const reqJson = readJson(requestBody);
  const resJson = readJson(responseBody);

  const reqVideoIds = new Set<string>();
  collectAddedVideoIds(reqJson, reqVideoIds);
  const reqPlaylistIds = new Set<string>();
  findPlaylistIds(reqJson, reqPlaylistIds);
  const hasAddVideoAction = anyStringMatches(
    reqJson,
    (s) => s === "ACTION_ADD_VIDEO" || s === "addToPlaylistCommand",
  );

  const resVideoIds = new Set<string>();
  collectEditedVideoIds(resJson, resVideoIds);
  const looksLikePlaylistEdit = PLAYLIST_EDIT_HINT_RE.test(url);
  const allVideoIds = new Set<string>([...reqVideoIds, ...resVideoIds]);

  if (allVideoIds.size === 0) return new Set();
  if (resVideoIds.size > 0) return resVideoIds;
  if (hasAddVideoAction || looksLikePlaylistEdit) return allVideoIds;
  return new Set();
}

export function inject(): void {
  const emitted = new Set<string>();

  function emitSave(videoId: string, trigger = "youtube:save"): void {
    if (!videoId || emitted.has(videoId)) return;
    emitted.add(videoId);
    capture(`https://www.youtube.com/watch?v=${videoId}`, trigger);
  }

  function handleYoutubeiPost(
    url: string,
    requestBody: string | null,
    responseBody: string | null,
  ): void {
    for (const id of classifyYoutubeiPost(url, requestBody, responseBody)) {
      emitSave(id);
    }
  }

  installInterceptor({
    id: "youtube",
    match: (req: RequestLens) =>
      req.method === "POST" &&
      (LIKE_RE.test(req.url) || YOUTUBEI_RE.test(req.url)),
    async onResponse(req, res) {
      if (!res.ok) return;
      if (LIKE_RE.test(req.url)) {
        const id = extractLikeVideoId(await req.readBody());
        if (id) emitSave(id, "youtube:like");
        return;
      }
      if (YOUTUBEI_RE.test(req.url)) {
        handleYoutubeiPost(req.url, await req.readBody(), await res.readText());
      }
    },
    onBeacon(url, body) {
      if (YOUTUBEI_RE.test(url)) handleYoutubeiPost(url, body, null);
    },
  });
}
