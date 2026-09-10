import { nativeRequestSchema } from "@pond/schema/native";
import { describe, expect, it, vi } from "vitest";
import { UnsupportedError } from "../core/pipeline/extractors/errors";
import { dispatchNative, type NativePorts } from "./rpc";

function ports(overrides: Partial<NativePorts> = {}): NativePorts {
  return {
    enqueue: vi.fn(),
    libraryInfo: vi.fn(),
    sessionPending: vi.fn(() => null),
    sessionImport: vi.fn(),
    appVersion: () => "0.0.1",
    ...overrides,
  };
}

describe("nativeRequestSchema", () => {
  it("accepts hello", () => {
    expect(nativeRequestSchema.parse({ type: "hello" })).toEqual({
      type: "hello",
    });
  });

  it("accepts an enqueue from a site intercept", () => {
    const row = nativeRequestSchema.parse({
      type: "enqueue",
      url: "https://x.com/i/web/status/1",
      trigger: "twitter:bookmark",
    });
    expect(row).toMatchObject({ type: "enqueue", trigger: "twitter:bookmark" });
  });
});

describe("dispatchNative", () => {
  it("rejects an invalid payload", async () => {
    await expect(dispatchNative({ type: "nope" }, ports())).resolves.toEqual({
      ok: false,
      error: "invalid",
    });
  });

  it("answers hello with the app version", async () => {
    await expect(dispatchNative({ type: "hello" }, ports())).resolves.toEqual({
      ok: true,
      data: { app: "pond", version: "0.0.1" },
    });
  });

  it("enqueues through the injected port", async () => {
    const enqueue = vi.fn().mockResolvedValue({ id: "01", created: true });
    const result = await dispatchNative(
      {
        type: "enqueue",
        url: "https://x.com/i/web/status/1",
        trigger: "toolbar",
      },
      ports({ enqueue }),
    );
    expect(result).toEqual({ ok: true, data: { id: "01", created: true } });
    expect(enqueue).toHaveBeenCalledWith("https://x.com/i/web/status/1", {
      trigger: "toolbar",
    });
  });

  it("maps UnsupportedError to unsupported_url", async () => {
    const enqueue = vi
      .fn()
      .mockRejectedValue(new UnsupportedError("no extractor matches url"));
    await expect(
      dispatchNative(
        { type: "enqueue", url: "https://example.invalid/x" },
        ports({ enqueue }),
      ),
    ).resolves.toEqual({ ok: false, error: "unsupported_url" });
  });

  it("returns library.info from the injected port", async () => {
    const libraryInfo = vi.fn().mockResolvedValue({ name: "Library" });
    await expect(
      dispatchNative({ type: "library.info" }, ports({ libraryInfo })),
    ).resolves.toEqual({ ok: true, data: { name: "Library" } });
  });

  it("returns folders.list from the injected port", async () => {
    const foldersList = vi
      .fn()
      .mockResolvedValue([{ id: "refs", name: "Refs" }]);
    await expect(
      dispatchNative({ type: "folders.list" }, ports({ foldersList })),
    ).resolves.toEqual({
      ok: true,
      data: [{ id: "refs", name: "Refs" }],
    });
  });
});
