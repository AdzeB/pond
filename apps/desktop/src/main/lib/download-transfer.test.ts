import type { DownloadActivityUpdate } from "@shared/download-activity";
import { describe, expect, it } from "vitest";
import { DownloadSizeError, fetchDownload } from "./download-transfer";

describe("observed download transfers", () => {
  it("reports actual response and bytes without exposing URL credentials or query tokens", async () => {
    const updates: DownloadActivityUpdate[] = [];
    const result = await fetchDownload({
      url: "https://user:password@media.example/video.mp4?token=secret#fragment",
      fileIndex: 2,
      fileCount: 3,
      maxBytes: 20,
      reportActivity: (update) => updates.push(update),
      fetcher: async (_url, options) => {
        expect(options?.method).toBe("GET");
        return new Response(new Uint8Array([1, 2, 3]), {
          headers: { "content-length": "3", "content-type": "video/mp4" },
        });
      },
    });
    expect(result.bytes).toEqual(Buffer.from([1, 2, 3]));
    expect(updates[0]?.phase).toBe("requesting");
    expect(updates.at(-1)?.transfer).toMatchObject({
      state: "completed",
      fileIndex: 2,
      fileCount: 3,
      receivedBytes: 3,
      totalBytes: 3,
      request: {
        method: "GET",
        host: "media.example",
        status: 200,
        contentType: "video/mp4",
      },
    });
    expect(JSON.stringify(updates)).not.toMatch(
      /password|token|secret|fragment|video\.mp4/,
    );
    expect(updates.some((update) => update.phase === "receiving")).toBe(true);
  });

  it("cancels an oversized unbounded stream as soon as the cap is crossed", async () => {
    let cancelled = false;
    const updates: DownloadActivityUpdate[] = [];
    await expect(
      fetchDownload({
        url: "https://media.example/image",
        fileIndex: 1,
        fileCount: 1,
        maxBytes: 100,
        imageMaxBytes: 2,
        reportActivity: (update) => updates.push(update),
        fetcher: async () =>
          new Response(
            new ReadableStream({
              pull(controller) {
                controller.enqueue(new Uint8Array(3));
              },
              cancel() {
                cancelled = true;
              },
            }),
            { headers: { "content-type": "image/png" } },
          ),
      }),
    ).rejects.toBeInstanceOf(DownloadSizeError);
    expect(cancelled).toBe(true);
    expect(updates.at(-1)?.transfer?.state).toBe("failed");
  });

  it("does not present compressed content length as a decoded byte total", async () => {
    const updates: DownloadActivityUpdate[] = [];
    await fetchDownload({
      url: "https://media.example/image",
      fileIndex: 1,
      fileCount: 1,
      maxBytes: 10,
      reportActivity: (update) => updates.push(update),
      fetcher: async () =>
        new Response(new Uint8Array(3), {
          headers: { "content-length": "2", "content-encoding": "gzip" },
        }),
    });
    expect(updates.at(-1)?.transfer?.totalBytes).toBeUndefined();
    expect(updates.at(-1)?.transfer?.receivedBytes).toBe(3);
  });

  it("propagates cancellation during a transfer and releases the body", async () => {
    const controller = new AbortController();
    let cancelled = false;
    await expect(
      fetchDownload({
        url: "https://media.example/image",
        fileIndex: 1,
        fileCount: 1,
        maxBytes: 10,
        signal: controller.signal,
        fetcher: async () =>
          new Response(
            new ReadableStream({
              pull(stream) {
                stream.enqueue(new Uint8Array(1));
                controller.abort();
              },
              cancel() {
                cancelled = true;
              },
            }),
          ),
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(cancelled).toBe(true);
  });

  it("releases rejected HTTP responses without reporting downloaded bytes", async () => {
    let cancelled = false;
    const updates: DownloadActivityUpdate[] = [];
    const result = await fetchDownload({
      url: "https://media.example/image",
      fileIndex: 1,
      fileCount: 1,
      maxBytes: 10,
      reportActivity: (update) => updates.push(update),
      fetcher: async () =>
        new Response(
          new ReadableStream({
            cancel() {
              cancelled = true;
            },
          }),
          { status: 429 },
        ),
    });
    expect(result.bytes).toBeNull();
    expect(cancelled).toBe(true);
    expect(updates.at(-1)?.transfer).toMatchObject({
      state: "failed",
      request: { status: 429 },
    });
  });
  it("does not start a request that was already cancelled", async () => {
    const controller = new AbortController();
    controller.abort();
    let requested = false;
    await expect(
      fetchDownload({
        url: "https://media.example/image",
        fileIndex: 1,
        fileCount: 1,
        maxBytes: 10,
        signal: controller.signal,
        fetcher: async () => {
          requested = true;
          return new Response();
        },
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(requested).toBe(false);
  });

  it("propagates body read failures and leaves a failed transfer", async () => {
    const updates: DownloadActivityUpdate[] = [];
    await expect(
      fetchDownload({
        url: "https://media.example/image",
        fileIndex: 1,
        fileCount: 1,
        maxBytes: 10,
        reportActivity: (update) => updates.push(update),
        fetcher: async () =>
          new Response(
            new ReadableStream({
              pull(controller) {
                controller.error(new Error("connection lost"));
              },
            }),
          ),
      }),
    ).rejects.toThrow("connection lost");
    expect(updates.at(-1)?.transfer?.state).toBe("failed");
  });
});
