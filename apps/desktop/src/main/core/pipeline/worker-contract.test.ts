import { describe, expect, it } from "vitest";
import { QueueWorkerResponseSchema } from "./worker-contract";

const identity = { jobId: "job", leaseToken: "lease", cancellationFence: 0 };
const bytes = new Uint8Array([1, 2, 3]);

describe("QueueWorkerResponseSchema", () => {
  it("keeps every field of a poster result", () => {
    const result = {
      kind: "poster" as const,
      filename: "poster-1.jpg",
      bytes,
      mimeType: "image/jpeg",
      width: 720,
      height: 900,
    };
    const parsed = QueueWorkerResponseSchema.parse({
      ...identity,
      ok: true,
      result,
    });
    expect(parsed.ok && parsed.result).toEqual(result);
  });

  it("keeps the bytes of a processed image that carries dims", () => {
    const result = {
      bytes,
      filename: "image-1.webp",
      mimeType: "image/webp",
      width: 720,
      height: 900,
    };
    const parsed = QueueWorkerResponseSchema.parse({
      ...identity,
      ok: true,
      result,
    });
    expect(parsed.ok && parsed.result).toEqual(result);
  });

  it("parses bare dims", () => {
    const parsed = QueueWorkerResponseSchema.parse({
      ...identity,
      ok: true,
      result: { width: 10, height: 20 },
    });
    expect(parsed.ok && parsed.result).toEqual({ width: 10, height: 20 });
  });
});
