import type { Source } from "@pond/schema/db";
import { type NativeResponse, nativeRequestSchema } from "@pond/schema/native";
import type { ExtensionCookie } from "@pond/schema/session";
import log from "electron-log/main.js";
import { UnsupportedError } from "../core/pipeline/extractors/errors";

export interface NativePorts {
  enqueue: (
    url: string,
    opts: { trigger?: string; cookies?: ExtensionCookie[] },
  ) => Promise<{ id: string; created: boolean; reseeded?: boolean }>;
  libraryInfo: () => Promise<unknown>;
  sessionPending: () => { source: Source } | null;
  sessionImport: (
    source: Source,
    cookies: ExtensionCookie[],
  ) => Promise<unknown>;
  appVersion: () => string;
}

export async function dispatchNative(
  raw: unknown,
  ports: NativePorts,
): Promise<NativeResponse> {
  const parsed = nativeRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "invalid" };
  }

  const req = parsed.data;
  try {
    switch (req.type) {
      case "hello":
        return {
          ok: true,
          data: { app: "pond", version: ports.appVersion() },
        };
      case "library.info":
        return { ok: true, data: await ports.libraryInfo() };
      case "session.pending":
        return { ok: true, data: ports.sessionPending() };
      case "enqueue": {
        const result = await ports.enqueue(req.url, {
          ...(req.trigger ? { trigger: req.trigger } : {}),
          ...(req.cookies && req.cookies.length > 0
            ? { cookies: req.cookies }
            : {}),
        });
        return { ok: true, data: result };
      }
      case "session.import": {
        const data = await ports.sessionImport(req.source, req.cookies);
        return { ok: true, data };
      }
    }
  } catch (err) {
    if (err instanceof UnsupportedError) {
      return { ok: false, error: "unsupported_url" };
    }
    log.error("[pond native] dispatch failed", req.type, err);
    return { ok: false, error: "internal" };
  }
}
