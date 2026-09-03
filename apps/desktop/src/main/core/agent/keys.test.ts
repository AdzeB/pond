import { afterEach, describe, expect, it, vi } from "vitest";
import { checkProviderKey } from "./keys";

const bases = {
  ollamaBaseUrl: "http://127.0.0.1:11434/v1",
  lmstudioBaseUrl: "http://127.0.0.1:1234/v1",
  compatibleBaseUrl: "",
};

describe("checkProviderKey", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("accepts an openai key when /models is ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) }),
    );
    const result = await checkProviderKey({
      provider: "openai",
      key: "sk-test",
      ...bases,
    });
    expect(result).toEqual({ ok: true });
  });

  it("rejects an openai key when /models is unauthorized", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401 }),
    );
    const result = await checkProviderKey({
      provider: "openai",
      key: "sk-bad",
      ...bases,
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/OpenAI rejected this key/);
  });

  it("checks ollama without a bearer token", async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });
    vi.stubGlobal("fetch", fetch);
    const result = await checkProviderKey({
      provider: "ollama",
      key: "",
      ...bases,
    });
    expect(result.ok).toBe(true);
    expect(fetch).toHaveBeenCalledWith("http://127.0.0.1:11434/v1/models", {
      headers: {},
    });
  });
});
