import { PrefsSchema } from "@pond/schema";
import type {
  MediaUnderstandOperationalMetric,
  MediaUnderstandResult,
} from "@shared/query-contracts-system";
import { describe, expect, it, vi } from "vitest";
import {
  createMediaUnderstandingRouter,
  type ShadowMediaBenchmarkRecord,
} from "./media-understanding-router";

describe("media understanding preferences", () => {
  it("keeps Florence as the backwards-compatible default", () => {
    const prefs = PrefsSchema.parse({});

    expect(prefs.ai.mediaUnderstandingMode).toBe("florence");
    expect(prefs.ai.mediaUnderstandingProvider).toBe("ollama");
    expect(prefs.ai.mediaUnderstandingModelId).toBe("gemma4:e2b");
    expect(prefs.ai.mediaUnderstandingFallbackToFlorence).toBe(false);
  });

  it("falls back field-by-field when stored values are invalid", () => {
    const prefs = PrefsSchema.parse({
      ai: {
        enableCaption: true,
        mediaUnderstandingMode: "removed-mode",
        mediaUnderstandingProvider: "cloud",
        mediaUnderstandingModelId: 42,
        mediaUnderstandingFallbackToFlorence: "yes",
      },
    });

    expect(prefs.ai.enableCaption).toBe(true);
    expect(prefs.ai.mediaUnderstandingMode).toBe("florence");
    expect(prefs.ai.mediaUnderstandingProvider).toBe("ollama");
    expect(prefs.ai.mediaUnderstandingModelId).toBe("gemma4:e2b");
    expect(prefs.ai.mediaUnderstandingFallbackToFlorence).toBe(false);
  });
});

function ai(
  mode: "florence" | "gemma4" | "shadow",
): ReturnType<typeof PrefsSchema.parse>["ai"] {
  return {
    ...PrefsSchema.parse({}).ai,
    mediaUnderstandingMode: mode,
    mediaUnderstandingProvider: "ollama",
    mediaUnderstandingModelId: "gemma4:e2b",
  };
}

function setup(
  result: MediaUnderstandResult = {
    ok: true,
    text: "Gemma caption",
    model: "ollama/gemma4:e2b:caption:v1",
  },
) {
  const records: ShadowMediaBenchmarkRecord[] = [];
  const operationalRecords: MediaUnderstandOperationalMetric[] = [];
  const runFlorence = vi.fn(async () => "Florence caption");
  const understandMedia = vi.fn(async () => result);
  const router = createMediaUnderstandingRouter({
    florenceModelVersion: () => "florence:v2",
    runFlorence,
    understandMedia,
    now: (() => {
      let time = 100;
      return () => {
        time += 25;
        return time;
      };
    })(),
    shadowSink: { record: (record) => records.push(record) },
    operationalSink: {
      record: (record) => operationalRecords.push(record),
    },
  });
  return {
    router,
    runFlorence,
    understandMedia,
    records,
    operationalRecords,
  };
}

describe("media-understanding router", () => {
  it("uses Florence as the sole primary in Florence mode", async () => {
    const { router, runFlorence, understandMedia } = setup();

    await expect(
      router.run({
        saveId: "save-1",
        imageUrl: "pond://save-1/image.png",
        task: "caption",
        prefs: ai("florence"),
      }),
    ).resolves.toEqual({ text: "Florence caption", model: "florence:v2" });
    expect(runFlorence).toHaveBeenCalledExactlyOnceWith(
      "caption",
      "pond://save-1/image.png",
    );
    expect(understandMedia).not.toHaveBeenCalled();
  });

  it("uses and returns Gemma output in Gemma mode", async () => {
    const { router, runFlorence, understandMedia } = setup();

    await expect(
      router.run({
        saveId: "save-1",
        imageUrl: "pond://save-1/image.png",
        task: "caption",
        prefs: ai("gemma4"),
      }),
    ).resolves.toEqual({
      text: "Gemma caption",
      model: "ollama/gemma4:e2b:caption:v1",
    });
    expect(understandMedia).toHaveBeenCalledExactlyOnceWith(
      "save-1",
      "caption",
    );
    expect(runFlorence).not.toHaveBeenCalled();
  });

  it("surfaces a primary Gemma query failure", async () => {
    const { router } = setup({ ok: false, reason: "model_unavailable" });

    await expect(
      router.run({
        saveId: "save-1",
        imageUrl: "pond://save-1/image.png",
        task: "caption",
        prefs: ai("gemma4"),
      }),
    ).rejects.toThrow("model_unavailable");
  });

  it("falls back to Florence only when the user enabled it", async () => {
    const { router, runFlorence, operationalRecords } = setup({
      ok: false,
      reason: "generation_failed",
      operation: {
        modelId: "gemma4:e2b",
        task: "caption",
        temperature: "warm",
        durationMs: 120,
        imageBytes: 512,
        outcome: "generation_failed",
        fallbackUsed: false,
      },
    });

    await expect(
      router.run({
        saveId: "save-1",
        imageUrl: "pond://save-1/image.png",
        task: "caption",
        prefs: {
          ...ai("gemma4"),
          mediaUnderstandingFallbackToFlorence: true,
        },
      }),
    ).resolves.toEqual({ text: "Florence caption", model: "florence:v2" });
    expect(runFlorence).toHaveBeenCalledOnce();
    expect(operationalRecords).toEqual([
      {
        modelId: "gemma4:e2b",
        task: "caption",
        temperature: "warm",
        durationMs: 120,
        imageBytes: 512,
        outcome: "generation_failed",
        fallbackUsed: true,
      },
    ]);
  });

  it("never falls back after cancellation", async () => {
    const { router, runFlorence } = setup({ ok: false, reason: "aborted" });

    await expect(
      router.run({
        saveId: "save-1",
        imageUrl: "pond://save-1/image.png",
        task: "caption",
        prefs: {
          ...ai("gemma4"),
          mediaUnderstandingFallbackToFlorence: true,
        },
      }),
    ).rejects.toThrow("aborted");
    expect(runFlorence).not.toHaveBeenCalled();
  });

  it("does not record fallback use when Florence also fails", async () => {
    const operationalRecords: MediaUnderstandOperationalMetric[] = [];
    const router = createMediaUnderstandingRouter({
      florenceModelVersion: () => "florence:v2",
      runFlorence: async () => {
        throw new Error("Florence failed");
      },
      understandMedia: async () => ({
        ok: false,
        reason: "generation_failed",
        operation: {
          modelId: "gemma4:e2b",
          task: "caption",
          temperature: "cold",
          durationMs: 100,
          imageBytes: 512,
          outcome: "generation_failed",
          fallbackUsed: false,
        },
      }),
      operationalSink: {
        record: (record) => operationalRecords.push(record),
      },
    });

    await expect(
      router.run({
        saveId: "save-1",
        imageUrl: "pond://save-1/image.png",
        task: "caption",
        prefs: {
          ...ai("gemma4"),
          mediaUnderstandingFallbackToFlorence: true,
        },
      }),
    ).rejects.toThrow("Florence failed");
    expect(operationalRecords).toEqual([]);
  });

  it("persists Florence semantics while measuring Gemma without content", async () => {
    const { router, understandMedia, records } = setup();

    await expect(
      router.run({
        saveId: "save-1",
        imageUrl: "pond://save-1/image.png",
        task: "caption",
        prefs: ai("shadow"),
      }),
    ).resolves.toEqual({ text: "Florence caption", model: "florence:v2" });
    await vi.waitFor(() => expect(records).toHaveLength(1));
    expect(understandMedia).toHaveBeenCalledExactlyOnceWith(
      "save-1",
      "caption",
    );
    expect(records).toEqual([
      {
        task: "caption",
        provider: "ollama",
        modelId: "gemma4:e2b",
        resultModel: "ollama/gemma4:e2b:caption:v1",
        durationMs: 25,
        outcome: "ok",
        outputCharacters: 13,
      },
    ]);
    expect(JSON.stringify(records)).not.toContain("Gemma caption");
    expect(JSON.stringify(records)).not.toContain("Florence caption");
    expect(JSON.stringify(records)).not.toContain("pond://");
  });

  it("does not wait for shadow Gemma before returning Florence", async () => {
    let finishGemma: (() => void) | undefined;
    const gemmaPending = new Promise<void>((resolve) => {
      finishGemma = resolve;
    });
    const understandMedia = vi.fn(async () => {
      await gemmaPending;
      return {
        ok: true as const,
        text: "private output",
        model: "ollama/gemma4:e2b:caption:v1",
      };
    });
    const router = createMediaUnderstandingRouter({
      florenceModelVersion: () => "florence:v2",
      runFlorence: async () => "Florence caption",
      understandMedia,
    });

    await expect(
      router.run({
        saveId: "save-1",
        imageUrl: "pond://save-1/image.png",
        task: "caption",
        prefs: ai("shadow"),
      }),
    ).resolves.toEqual({ text: "Florence caption", model: "florence:v2" });
    expect(understandMedia).toHaveBeenCalledOnce();
    finishGemma?.();
  });

  it("isolates Gemma and benchmark sink failures from shadow Florence", async () => {
    const { router } = setup({ ok: false, reason: "model_unavailable" });
    const sinkFailureRouter = createMediaUnderstandingRouter({
      florenceModelVersion: () => "florence:v2",
      runFlorence: async () => "Florence caption",
      understandMedia: async () => ({
        ok: true,
        text: "private output",
        model: "ollama/gemma4:e2b:caption:v1",
      }),
      now: () => 0,
      shadowSink: {
        record() {
          throw new Error("sink offline");
        },
      },
    });

    await expect(
      router.run({
        saveId: "save-1",
        imageUrl: "pond://save-1/image.png",
        task: "caption",
        prefs: ai("shadow"),
      }),
    ).resolves.toEqual({ text: "Florence caption", model: "florence:v2" });
    await expect(
      sinkFailureRouter.run({
        saveId: "save-1",
        imageUrl: "pond://save-1/image.png",
        task: "caption",
        prefs: ai("shadow"),
      }),
    ).resolves.toEqual({ text: "Florence caption", model: "florence:v2" });
  });

  it("stamps eligibility with the active primary model", () => {
    const { router } = setup();

    expect(router.primaryModel("ocr", ai("florence"))).toBe("florence:v2");
    expect(router.primaryModel("ocr", ai("shadow"))).toBe("florence:v2");
    expect(router.primaryModel("ocr", ai("gemma4"))).toBe(
      "ollama/gemma4:e2b:ocr:v1",
    );
  });
});
