import { open, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { net, protocol } from "electron";
import log from "electron-log/main.js";
import { POND_PROTOCOL } from "../shared/constants";
import {
  clampThumbWidth,
  getOrCreateThumbnail,
  isThumbnailable,
} from "./lib/thumbnail";
import { itemFile, libraryRoot, resolvePaths } from "./paths";

const ONE_YEAR_SECONDS = 31_536_000;

const META_HOST = "_meta";
const META_DIR = "_meta";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".html": "text/html; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
};

export function registerScheme() {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: POND_PROTOCOL,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        stream: true,
        // Allow cross-origin reads (with the ACAO header below) so the
        // renderer can fetch item bytes for on-device work like
        // sensitive-media classification. Chromium otherwise refuses CORS for
        // custom schemes entirely.
        corsEnabled: true,
      },
    },
  ]);
}

export function registerProtocol() {
  protocol.handle(POND_PROTOCOL, async (request) => {
    try {
      const url = new URL(request.url);
      const host = url.hostname;
      const file = decodeURIComponent(url.pathname.replace(/^\//, ""));
      if (!host || !file) {
        return new Response("bad request", { status: 400 });
      }

      const { resolved, prefix } = resolveTarget(host, file);
      if (!resolved.startsWith(prefix)) {
        return new Response("forbidden", { status: 403 });
      }

      // Pick what we actually serve. When the client asks for a
      // downscaled width (`?w=`) on a still raster image, hand back a
      // generated WebP thumbnail from `_thumbs/`; otherwise the original.
      const version = url.searchParams.get("v");
      let target = resolved;
      let immutable = version !== null;

      const widthParam = url.searchParams.get("w");
      if (
        host !== META_HOST &&
        widthParam &&
        isThumbnailable(extname(resolved).toLowerCase())
      ) {
        const width = clampThumbWidth(Number(widthParam));
        if (width !== null) {
          const thumb = await getOrCreateThumbnail({
            saveId: host,
            sourcePath: resolved,
            width,
            version,
          });
          if (thumb) {
            // Keyed by both content version and width, so the bytes for
            // a given URL never change: safe to cache forever.
            target = thumb.path;
            immutable = true;
          }
        }
      }

      const info = await stat(target);
      if (!info.isFile()) {
        return new Response("not found", { status: 404 });
      }

      const total = info.size;
      const ext = extname(target).toLowerCase();
      const contentType = MIME[ext] ?? "application/octet-stream";

      const headers = new Headers();
      headers.set("content-type", contentType);
      headers.set("accept-ranges", "bytes");
      // Let the renderer read these bytes back into a canvas/tensor for
      // on-device work (e.g. sensitive-content classification). Without an
      // ACAO header a `crossOrigin` <img> from this scheme taints the canvas
      // and pixel reads throw. The data is local files the renderer already
      // renders, so exposing read access carries no new risk.
      headers.set("access-control-allow-origin", "*");
      // Content-addressed URLs (`?v=<sha>`) and thumbnails are immutable;
      // everything else gets a short window so edits still surface.
      headers.set(
        "cache-control",
        immutable
          ? `public, max-age=${ONE_YEAR_SECONDS}, immutable`
          : "public, max-age=600",
      );

      const rangeHeader = request.headers.get("range");
      if (rangeHeader) {
        const m = /^bytes=(\d+)-(\d*)$/i.exec(rangeHeader.trim());
        if (!m) {
          headers.set("content-range", `bytes */${total}`);
          return new Response("invalid range", { status: 416, headers });
        }
        const start = Number(m[1]);
        const end =
          m[2] && m[2].length > 0
            ? Math.min(Number(m[2]), total - 1)
            : total - 1;
        if (
          !Number.isFinite(start) ||
          !Number.isFinite(end) ||
          start > end ||
          start < 0 ||
          start >= total
        ) {
          headers.set("content-range", `bytes */${total}`);
          return new Response("range not satisfiable", {
            status: 416,
            headers,
          });
        }
        const length = end - start + 1;
        const buf = Buffer.alloc(length);
        const fh = await open(target, "r");
        try {
          await fh.read(buf, 0, length, start);
        } finally {
          await fh.close();
        }
        headers.set("content-range", `bytes ${start}-${end}/${total}`);
        headers.set("content-length", String(length));
        return new Response(buf, { status: 206, headers });
      }

      const fullBuf = Buffer.alloc(total);
      const fh = await open(target, "r");
      try {
        await fh.read(fullBuf, 0, total, 0);
      } finally {
        await fh.close();
      }
      headers.set("content-length", String(total));
      return new Response(fullBuf, { status: 200, headers });
    } catch (err) {
      const isMissing =
        err instanceof Error && /ENOENT/.test(err.message ?? "");
      if (isMissing) {
        log.debug("[pond://] not found", request.url);
      } else {
        log.warn("[pond://] resolve failed", request.url, err);
      }
      return new Response("not found", { status: 404 });
    }
  });
  void net;
}

function resolveTarget(
  host: string,
  file: string,
): { resolved: string; prefix: string } {
  if (host === META_HOST) {
    const base = join(libraryRoot(), META_DIR);
    return { resolved: resolve(join(base, file)), prefix: normalize(base) };
  }
  return {
    resolved: resolve(itemFile(host, file)),
    prefix: normalize(resolvePaths().itemsDir),
  };
}
