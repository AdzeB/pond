import type { JsonValue } from "@pond/schema/json";
import { describe, expect, it, vi } from "vitest";
import { PondLocalApi, PondLocalApiError } from "./index";

function response(body: JsonValue, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("PondLocalApi", () => {
  it("rejects non-loopback endpoints by default", () => {
    expect(
      () => new PondLocalApi({ baseUrl: "https://example.com/api/v2" }),
    ).toThrow("loopback");
  });

  it("authenticates and validates successful responses", async () => {
    const fetcher = vi.fn(async () =>
      response({
        status: "success",
        data: {
          name: "pond",
          version: "1.2.3",
          platform: "darwin",
          arch: "arm64",
        },
      }),
    );
    const client = new PondLocalApi({
      token: async () => "secret",
      fetch: fetcher,
    });
    await expect(client.appInfo()).resolves.toMatchObject({ version: "1.2.3" });
    expect(fetcher).toHaveBeenCalledWith(
      "http://127.0.0.1:41610/api/v2/app/info",
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: "Bearer secret",
        }),
      }),
    );
  });

  it("returns thumbnail bytes with their image type", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(new Uint8Array([137, 80, 78, 71]), {
          headers: { "content-type": "image/png" },
        }),
    );
    const client = new PondLocalApi({ token: "secret", fetch: fetcher });
    await expect(client.thumbnail("save 1")).resolves.toEqual({
      type: "image/png",
      bytes: new Uint8Array([137, 80, 78, 71]),
    });
    expect(fetcher).toHaveBeenCalledWith(
      "http://127.0.0.1:41610/api/v2/saves/thumb?id=save%201",
      expect.objectContaining({
        headers: expect.objectContaining({ authorization: "Bearer secret" }),
      }),
    );
  });

  it("returns no thumbnail when the Save has no cover", async () => {
    const client = new PondLocalApi({
      fetch: async () => response({ status: "error", error: "no cover" }, 404),
    });
    await expect(client.thumbnail("save")).resolves.toBeNull();
  });

  it("rejects thumbnail requests with a stale token", async () => {
    const client = new PondLocalApi({
      fetch: async () =>
        response({ status: "error", error: "unauthorized" }, 401),
    });
    await expect(client.thumbnail("save")).rejects.toMatchObject({
      kind: "authentication",
    });
  });

  it("maps API failures to typed errors", async () => {
    const client = new PondLocalApi({
      fetch: async () =>
        response({ status: "error", error: "unauthorized" }, 401),
    });
    await expect(client.appInfo()).rejects.toBeInstanceOf(PondLocalApiError);
    await expect(client.appInfo()).rejects.toMatchObject({
      kind: "authentication",
      status: 401,
    });
  });
});
