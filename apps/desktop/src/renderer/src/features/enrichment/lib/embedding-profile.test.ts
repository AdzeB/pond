import { describe, expect, it } from "vitest";
import {
  createEmbeddingProfileCache,
  type EmbeddingProfile,
  embeddingProfileConfig,
  type LoadedEmbeddingProfile,
} from "./embedding-profile";

interface TestProfile extends LoadedEmbeddingProfile {
  instance: number;
}

function testLoader(options?: { failOnce?: EmbeddingProfile }) {
  const loaded: EmbeddingProfile[] = [];
  const disposed: number[] = [];
  let instance = 0;
  let failed = false;

  return {
    disposed,
    loaded,
    load: async (profile: EmbeddingProfile): Promise<TestProfile> => {
      loaded.push(profile);
      if (profile === options?.failOnce && !failed) {
        failed = true;
        throw new Error("load failed");
      }
      const current = ++instance;
      return {
        profile,
        instance: current,
        dispose: async () => {
          disposed.push(current);
        },
      };
    },
  };
}

describe("embedding profile cache", () => {
  it("reuses repeated requests for the same profile", async () => {
    const loader = testLoader();
    const cache = createEmbeddingProfileCache(loader.load);

    const first = await cache.use("text-image", async (profile) => profile);
    const second = await cache.use("text-image", async (profile) => profile);

    expect(second).toBe(first);
    expect(loader.loaded).toEqual(["text-image"]);
    expect(loader.disposed).toEqual([]);
  });

  it("disposes the previous profile exactly once when switching", async () => {
    const loader = testLoader();
    const cache = createEmbeddingProfileCache(loader.load);

    const image = await cache.use("text-image", async (profile) => profile);
    const audio = await cache.use("text-audio", async (profile) => profile);
    const reusedAudio = await cache.use(
      "text-audio",
      async (profile) => profile,
    );

    expect(audio).toBe(reusedAudio);
    expect(loader.loaded).toEqual(["text-image", "text-audio"]);
    expect(loader.disposed).toEqual([image.instance]);
  });

  it("can retry after a failed load", async () => {
    const loader = testLoader({ failOnce: "text-audio" });
    const cache = createEmbeddingProfileCache(loader.load);

    await expect(
      cache.use("text-audio", async (profile) => profile),
    ).rejects.toThrow("load failed");
    const recovered = await cache.use("text-audio", async (profile) => profile);

    expect(recovered.profile).toBe("text-audio");
    expect(loader.loaded).toEqual(["text-audio", "text-audio"]);
  });

  it("releases the queue after profile work fails", async () => {
    const loader = testLoader();
    const cache = createEmbeddingProfileCache(loader.load);

    await expect(
      cache.use("text-image", async () => {
        throw new Error("inference failed");
      }),
    ).rejects.toThrow("inference failed");
    const recovered = await cache.use("text-image", async (profile) => profile);

    expect(recovered.profile).toBe("text-image");
    expect(loader.loaded).toEqual(["text-image"]);
  });

  it("waits for in-flight work before disposing during a profile switch", async () => {
    const events: string[] = [];
    let releaseImage = () => {};
    const imageGate = new Promise<void>((resolve) => {
      releaseImage = resolve;
    });
    let markImageStarted = () => {};
    const imageStarted = new Promise<void>((resolve) => {
      markImageStarted = resolve;
    });
    const cache = createEmbeddingProfileCache(async (profile) => {
      events.push(`load:${profile}`);
      return {
        profile,
        dispose: async () => {
          events.push(`dispose:${profile}`);
        },
      };
    });

    const imageWork = cache.use("text-image", async () => {
      events.push("work:text-image:start");
      markImageStarted();
      await imageGate;
      events.push("work:text-image:end");
    });
    await imageStarted;
    const audioWork = cache.use("text-audio", async () => {
      events.push("work:text-audio");
    });
    await Promise.resolve();

    expect(events).toEqual(["load:text-image", "work:text-image:start"]);

    releaseImage();
    await Promise.all([imageWork, audioWork]);
    expect(events).toEqual([
      "load:text-image",
      "work:text-image:start",
      "work:text-image:end",
      "dispose:text-image",
      "load:text-audio",
      "work:text-audio",
    ]);
  });

  it("loads mutually exclusive encoder configurations", () => {
    expect(embeddingProfileConfig("text-image")).toEqual({
      audio_config: null,
    });
    expect(embeddingProfileConfig("text-audio")).toEqual({
      vision_config: null,
    });
  });
});
