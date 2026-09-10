import type { CaptureReceipt, CaptureWebDraft } from "@pond/schema/capture";
import type { Source } from "@pond/schema/db";
import type { JsonValue } from "@pond/schema/json";
import { type NativeResponse, nativeRequestSchema } from "@pond/schema/native";
import type {
  ExtensionCookie,
  SessionImportResponse,
} from "@pond/schema/session";
import log from "electron-log/main.js";
import { UnsupportedError } from "../core/pipeline/extractors/errors";
import type { LibraryInfo } from "../ops/library";

export interface EnqueueOpts {
  trigger?: string;
  cookies?: ExtensionCookie[];
}

export interface EnqueueResult {
  id: string;
  created: boolean;
  reseeded?: boolean;
}

export interface NativePorts {
  capture?: (
    draft: CaptureWebDraft,
    cookies?: ExtensionCookie[],
  ) => Promise<CaptureReceipt>;
  enqueue: (url: string, opts: EnqueueOpts) => Promise<EnqueueResult>;
  libraryInfo: () => Promise<LibraryInfo>;
  foldersList?: () => Promise<{ id: string; name: string }[]>;
  sessionPending: () => { source: Source } | null;
  sessionImport: (
    source: Source,
    cookies: ExtensionCookie[],
  ) => Promise<SessionImportResponse>;
  appVersion: () => string;
}

export async function dispatchNative(
  raw: JsonValue,
  ports: NativePorts,
): Promise<NativeResponse> {
  const parsed = nativeRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "invalid" };
  }

  const req = parsed.data;
  try {
    switch (req.type) {
      case "capture.accept":
        if (!ports.capture) return { ok: false, error: "capture_unavailable" };
        return { ok: true, data: await ports.capture(req.draft, req.cookies) };
      case "hello":
        return {
          ok: true,
          data: { app: "pond", version: ports.appVersion() },
        };
      case "library.info":
        return { ok: true, data: await ports.libraryInfo() };
      case "folders.list":
        if (!ports.foldersList)
          return { ok: false, error: "folders_unavailable" };
        return { ok: true, data: await ports.foldersList() };
      case "session.pending":
        return { ok: true, data: ports.sessionPending() };
      case "enqueue": {
        const opts: EnqueueOpts = {};
        if (req.trigger) opts.trigger = req.trigger;
        if (req.cookies && req.cookies.length > 0) opts.cookies = req.cookies;
        return { ok: true, data: await ports.enqueue(req.url, opts) };
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
