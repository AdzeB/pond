import { unlinkSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { createConnection } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { JsonValue } from "@pond/schema/json";
import type { NativeMessage } from "@pond/schema/native";
import { afterEach, describe, expect, it, vi } from "vitest";
import { encodeFrame, tryDecodeFrame } from "./frame";
import { startNativeServer, stopNativeServer } from "./server";

async function readFrame(
  path: string,
  request: NativeMessage,
): Promise<JsonValue> {
  const socket = createConnection(path);
  const chunks: Buffer[] = [];
  const done = new Promise<JsonValue>((resolve, reject) => {
    socket.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      const decoded = tryDecodeFrame(Buffer.concat(chunks));
      if (decoded.status === "need-more") return;
      if (decoded.status === "invalid") {
        reject(new Error(decoded.error));
        return;
      }
      resolve(decoded.value);
    });
    socket.on("error", reject);
  });
  socket.write(encodeFrame(request));
  return done;
}

describe("native unix server", () => {
  let dir: string | null = null;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
    dir = null;
  });

  it("dispatches a framed request over a temp socket", async () => {
    dir = await mkdtemp(join(tmpdir(), "pond-native-"));
    const path = join(dir, "native.sock");
    const dispatch = vi.fn(async () => ({
      ok: true as const,
      data: { app: "pond" },
    }));
    const server = await startNativeServer({ path, dispatch });
    try {
      await expect(readFrame(path, { type: "hello" })).resolves.toEqual({
        ok: true,
        data: { app: "pond" },
      });
      expect(dispatch).toHaveBeenCalledWith({ type: "hello" });
    } finally {
      await stopNativeServer(server);
    }
  });

  it("rejects an oversized frame without calling dispatch", async () => {
    dir = await mkdtemp(join(tmpdir(), "pond-native-"));
    const path = join(dir, "native.sock");
    const dispatch = vi.fn();
    const server = await startNativeServer({ path, dispatch });
    try {
      const header = Buffer.alloc(4);
      header.writeUInt32LE(9 * 1024 * 1024, 0);
      await expect(readFrameRaw(path, header)).resolves.toEqual({
        ok: false,
        error: "invalid",
      });
      expect(dispatch).not.toHaveBeenCalled();
    } finally {
      await stopNativeServer(server);
    }
  });

  it("keeps the replacement socket reachable after the previous listener stops", async () => {
    dir = await mkdtemp(join(tmpdir(), "pond-native-"));
    const path = join(dir, "native.sock");
    const first = await startNativeServer({
      path,
      dispatch: async () => ({ ok: true as const, data: { n: 1 } }),
    });
    const second = await startNativeServer({
      path,
      dispatch: async () => ({ ok: true as const, data: { n: 2 } }),
    });
    await stopNativeServer(first);
    await vi.waitFor(
      async () => {
        await expect(readFrame(path, { type: "hello" })).resolves.toEqual({
          ok: true,
          data: { n: 2 },
        });
      },
      { timeout: 3000, interval: 50 },
    );
    await stopNativeServer(second);
  });

  it("restores the socket file if it disappears while listening", async () => {
    dir = await mkdtemp(join(tmpdir(), "pond-native-"));
    const path = join(dir, "native.sock");
    const server = await startNativeServer({
      path,
      dispatch: async () => ({ ok: true as const, data: { app: "pond" } }),
    });
    try {
      unlinkSync(path);
      await vi.waitFor(
        async () => {
          await expect(readFrame(path, { type: "hello" })).resolves.toEqual({
            ok: true,
            data: { app: "pond" },
          });
        },
        { timeout: 3000, interval: 100 },
      );
    } finally {
      await stopNativeServer(server);
    }
  });
});

async function readFrameRaw(path: string, bytes: Buffer): Promise<JsonValue> {
  const socket = createConnection(path);
  const chunks: Buffer[] = [];
  const done = new Promise<JsonValue>((resolve, reject) => {
    socket.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      const decoded = tryDecodeFrame(Buffer.concat(chunks));
      if (decoded.status === "need-more") return;
      if (decoded.status === "invalid") {
        reject(new Error(decoded.error));
        return;
      }
      resolve(decoded.value);
    });
    socket.on("error", reject);
  });
  socket.write(bytes);
  return done;
}
