export type EmbeddingProfile = "text-image" | "text-audio";

export interface LoadedEmbeddingProfile {
  profile: EmbeddingProfile;
  dispose(): Promise<void>;
}

export type EmbeddingProfileConfig =
  | { audio_config: null }
  | { vision_config: null };

export function embeddingProfileConfig(
  profile: EmbeddingProfile,
): EmbeddingProfileConfig {
  return profile === "text-image"
    ? { audio_config: null }
    : { vision_config: null };
}

export interface EmbeddingProfileCache<T extends LoadedEmbeddingProfile> {
  use<R>(profile: EmbeddingProfile, run: (loaded: T) => Promise<R>): Promise<R>;
  dispose(): Promise<void>;
}

export function createEmbeddingProfileCache<T extends LoadedEmbeddingProfile>(
  load: (profile: EmbeddingProfile) => Promise<T>,
): EmbeddingProfileCache<T> {
  let loaded: T | null = null;
  let transition = Promise.resolve();

  return {
    use(profile, run) {
      const operation = transition.then(async () => {
        if (loaded?.profile !== profile) {
          if (loaded) {
            await loaded.dispose();
            loaded = null;
          }
          loaded = await load(profile);
        }
        return run(loaded);
      });
      transition = operation.then(
        () => undefined,
        () => undefined,
      );
      return operation;
    },
    dispose() {
      const done = transition.then(async () => {
        if (loaded) await loaded.dispose();
        loaded = null;
      });
      transition = done.then(
        () => undefined,
        () => undefined,
      );
      return done;
    },
  };
}
