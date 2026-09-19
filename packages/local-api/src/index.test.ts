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
