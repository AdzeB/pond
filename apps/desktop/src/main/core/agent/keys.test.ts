import { describe, expect, it } from "vitest";
import { checkProviderKey } from "./keys";

const bases = {
  ollamaBaseUrl: "http://127.0.0.1:11434/v1",
  lmstudioBaseUrl: "http://127.0.0.1:1234/v1",
  compatibleBaseUrl: "http://127.0.0.1:9000/v1",
};

describe("checkProviderKey", () => {
  it("accepts an openai key when models are available", async () => {
    const result = await checkProviderKey(
      { provider: "openai", key: "sk-test", ...bases },
      async () => Response.json({ data: [] }),
    );
    expect(result).toEqual({ ok: true });
  });

  it("rejects unauthorized credentials", async () => {
    const result = await checkProviderKey(
      { provider: "openai", key: "sk-bad", ...bases },
      async () => new Response(null, { status: 401 }),
    );
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/OpenAI rejected this key/);
  });

  it("checks ollama without a bearer token", async () => {
    const result = await checkProviderKey(
      { provider: "ollama", key: "", ...bases },
      async (url, options) => {
        expect(url).toBe("http://127.0.0.1:11434/v1/models");
        expect(options?.headers).toEqual({});
        expect(options?.signal).toBeInstanceOf(AbortSignal);
        return Response.json({ data: [] });
      },
    );
    expect(result.ok).toBe(true);
  });

  it.each([
    429, 500, 503,
  ])("does not call a discovery failure (%i) an invalid key", async (status) => {
    const result = await checkProviderKey(
      { provider: "openai", key: "sk-test", ...bases },
      async () => new Response(null, { status }),
    );
    expect(result.ok).toBe(false);
    expect(result.error).toContain(`HTTP ${status}`);
    expect(result.error).not.toContain("rejected");
  });

  it.each([
    404, 405, 501,
  ])("allows custom endpoints without model listing (%i)", async (status) => {
    const result = await checkProviderKey(
      { provider: "compatible", key: "custom-key", ...bases },
      async () => new Response(null, { status }),
    );
    expect(result).toEqual({ ok: true });
  });

  it("does not treat a malformed endpoint response as a valid model list", async () => {
    const result = await checkProviderKey(
      { provider: "lmstudio", key: "", ...bases },
      async () => Response.json({ message: "not a models endpoint" }),
    );
    expect(result).toEqual({
      ok: false,
      error: "LM Studio returned an invalid model list.",
    });
  });

  it("does not send a custom key to OpenAI when the custom base is missing", async () => {
    const result = await checkProviderKey(
      {
        provider: "compatible",
        key: "custom-key",
        ...bases,
        compatibleBaseUrl: "",
      },
      async () => {
        throw new Error("Must not request another provider");
      },
    );
    expect(result).toEqual({
      ok: false,
      error: "Enter an API base URL first.",
    });
  });

  it("keeps Gemini credentials out of the URL", async () => {
    const result = await checkProviderKey(
      { provider: "gemini", key: "secret", ...bases },
      async (url, options) => {
        expect(url).toBe(
          "https://generativelanguage.googleapis.com/v1beta/models",
        );
        expect(options?.headers).toEqual({ "x-goog-api-key": "secret" });
        return Response.json({ models: [] });
      },
    );
    expect(result.ok).toBe(true);
  });
});
