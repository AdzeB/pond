import { unlinkSync } from "node:fs";
import { chmod, mkdir } from "node:fs/promises";
import { createServer, type Server, type Socket } from "node:net";
import { dirname } from "node:path";
import type { NativeResponse } from "@pond/schema/native";
import log from "electron-log/main.js";
import { encodeFrame, tryDecodeFrame } from "./frame";
import { nativeSocketPath } from "./paths";
import { liveNativePorts } from "./ports";
import { dispatchNative } from "./rpc";

export type NativeDispatch = (raw: unknown) => Promise<NativeResponse>;

export interface NativeServerOpts {
  path?: string;
  dispatch?: NativeDispatch;
}

const listenPaths = new WeakMap<Server, string>();

function writeFrame(socket: Socket, value: unknown): void {
  socket.end(encodeFrame(value));
}

function handleConn(socket: Socket, dispatch: NativeDispatch): void {
  const chunks: Buffer[] = [];
  let settled = false;

  const fail = (error: string) => {
    if (settled) return;
    settled = true;
    writeFrame(socket, { ok: false, error });
  };

  socket.on("data", (chunk) => {
    if (settled) return;
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    const decoded = tryDecodeFrame(Buffer.concat(chunks));
    if (decoded.status === "need-more") return;
    if (decoded.status === "invalid") {
      fail(decoded.error);
      return;
    }
    settled = true;
    void dispatch(decoded.value).then(
      (res) => writeFrame(socket, res),
      (err) => {
        log.error("[pond native] handler threw", err);
        writeFrame(socket, { ok: false, error: "internal" });
      },
    );
  });

  socket.on("error", (err) => {
    log.warn("[pond native] connection error", err);
  });
}

export async function startNativeServer(
  opts: NativeServerOpts = {},
): Promise<Server> {
  const path = opts.path ?? nativeSocketPath();
  const dispatch =
    opts.dispatch ?? ((raw) => dispatchNative(raw, liveNativePorts()));
  await mkdir(dirname(path), { recursive: true });
  try {
    unlinkSync(path);
  } catch {}

  const server = createServer((socket) => handleConn(socket, dispatch));
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(path, () => resolve());
  });
  await chmod(path, 0o600);
  listenPaths.set(server, path);
  log.info("[pond native] listening", path);
  return server;
}

export async function stopNativeServer(server: Server | null): Promise<void> {
  if (!server) return;
  const path = listenPaths.get(server);
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
  if (!path) return;
  try {
    unlinkSync(path);
  } catch {}
}
