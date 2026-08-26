import { describe, expect, it } from "vitest";
import { encodeFrame, MAX_NATIVE_MSG, tryDecodeFrame } from "./frame";

describe("native frame", () => {
  it("round-trips JSON", () => {
    const encoded = encodeFrame({ ok: true, data: { app: "pond" } });
    expect(tryDecodeFrame(encoded)).toEqual({
      status: "ok",
      value: { ok: true, data: { app: "pond" } },
    });
  });

  it("asks for more bytes until the payload is complete", () => {
    const encoded = encodeFrame({ type: "hello" });
    expect(tryDecodeFrame(encoded.subarray(0, 2))).toEqual({
      status: "need-more",
    });
    expect(tryDecodeFrame(encoded.subarray(0, 4))).toEqual({
      status: "need-more",
    });
    expect(tryDecodeFrame(encoded)).toMatchObject({ status: "ok" });
  });

  it("rejects a zero-length payload", () => {
    const header = Buffer.alloc(4);
    header.writeUInt32LE(0, 0);
    expect(tryDecodeFrame(header)).toEqual({
      status: "invalid",
      error: "invalid",
    });
  });

  it("rejects a payload larger than MAX_NATIVE_MSG", () => {
    const header = Buffer.alloc(4);
    header.writeUInt32LE(MAX_NATIVE_MSG + 1, 0);
    expect(tryDecodeFrame(header)).toEqual({
      status: "invalid",
      error: "invalid",
    });
  });
});
