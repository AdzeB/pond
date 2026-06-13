import { open, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { net, protocol } from "electron";
import log from "electron-log/main.js";
import mime from "mime-types";
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

export function registerScheme() {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: POND_PROTOCOL,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        stream: true,
        // Allow cross-origin reads (ACAO header below) so the renderer can fetch item bytes.
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

      // Serve a generated WebP thumb when `?w=` is set on a still raster; else the original.
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
            // Keyed by version + width, so the bytes never change: cache forever.
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
      const contentType = mime.contentType(ext) || "application/octet-stream";

      const headers = new Headers();
      headers.set("content-type", contentType);
      headers.set("accept-ranges", "bytes");
      // ACAO header so the renderer can read bytes into a canvas without tainting it.
      headers.set("access-control-allow-origin", "*");
      // Content-addressed (`?v=`) URLs and thumbs are immutable; others get a short window.
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
