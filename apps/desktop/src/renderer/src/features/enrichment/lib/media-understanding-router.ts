import type { Prefs } from "@pond/schema/db";
import type {
  MediaUnderstandInput,
  MediaUnderstandOperationalMetric,
  MediaUnderstandResult,
} from "@shared/query-contracts-system";
import { florenceModelVersion, runFlorence } from "./florence";
import { loadImage } from "./image";

export type MediaUnderstandingTask = MediaUnderstandInput["task"];

export type ShadowMediaBenchmarkRecord = {
  task: MediaUnderstandingTask;
  provider: Prefs["ai"]["mediaUnderstandingProvider"];
  modelId: string;
  resultModel?: string;
  durationMs: number;
  outcome: "ok" | "error";
  outputCharacters?: number;
};

export interface ShadowMediaBenchmarkSink {
  record(record: ShadowMediaBenchmarkRecord): void;
}

type MediaUnderstandingRouterDependencies = {
  florenceModelVersion: () => string;
  runFlorence: (
    task: MediaUnderstandingTask,
    imageUrl: string,
  ) => Promise<string>;
  understandMedia: (
    saveId: string,
    task: MediaUnderstandingTask,
  ) => Promise<MediaUnderstandResult>;
  now: () => number;
  shadowSink: ShadowMediaBenchmarkSink;
  operationalSink: {
    record(metric: MediaUnderstandOperationalMetric): void;
  };
};

type MediaUnderstandingRunInput = {
  saveId: string;
  imageUrl: string;
  task: MediaUnderstandingTask;
  prefs: Prefs["ai"];
};

type MediaUnderstandingText = { text: string; model: string };

class GemmaMediaUnderstandingError extends Error {
  readonly reason: Extract<MediaUnderstandResult, { ok: false }>["reason"];
  readonly operation?: MediaUnderstandOperationalMetric;

  constructor(result: Extract<MediaUnderstandResult, { ok: false }>) {
    super(`Local media understanding failed: ${result.reason}`);
    this.name = "GemmaMediaUnderstandingError";
    this.reason = result.reason;
    this.operation = result.operation;
  }
}

const FLORENCE_TASK = {
  caption: "<CAPTION>",
  ocr: "<OCR>",
} as const;

const MAX_RECORDED_MODEL_ID_CHARACTERS = 200;
const MAX_RECORDED_OUTPUT_CHARACTERS = 16_000;
const MAX_RECORDED_DURATION_MS = 10 * 60_000;

const defaultDependencies: MediaUnderstandingRouterDependencies = {
  florenceModelVersion,
  async runFlorence(task, imageUrl) {
    const image = await loadImage(imageUrl);
    return runFlorence(image, FLORENCE_TASK[task]);
  },
  understandMedia(saveId, task) {
    return window.pond.query("saves.understandMedia", { saveId, task });
  },
  now: () => performance.now(),
  shadowSink: { record() {} },
  operationalSink: {
    record(metric) {
      console.info("[pond media] local understanding fallback", metric);
    },
  },
};

function gemmaModelVersion(
  task: MediaUnderstandingTask,
  prefs: Prefs["ai"],
): string {
  return `${prefs.mediaUnderstandingProvider}/${prefs.mediaUnderstandingModelId.trim()}:${task}:v1`;
}

function boundedInteger(value: number, maximum: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(maximum, Math.max(0, Math.round(value)));
}

function boundedText(value: string): string {
  return value.slice(0, MAX_RECORDED_MODEL_ID_CHARACTERS);
}

function gemmaFailure(result: Extract<MediaUnderstandResult, { ok: false }>) {
  return new GemmaMediaUnderstandingError(result);
}

const FALLBACK_FAILURES = new Set<
  Extract<MediaUnderstandResult, { ok: false }>["reason"]
>([
  "model_unavailable",
  "model_not_vision",
  "timeout",
  "generation_failed",
  "empty_output",
  "model_chatter",
  "output_too_long",
  "internal_error",
]);

export function createMediaUnderstandingRouter(
  dependencies: Partial<MediaUnderstandingRouterDependencies> = {},
) {
  const resolved = { ...defaultDependencies, ...dependencies };

  async function runGemma(
    saveId: string,
    task: MediaUnderstandingTask,
  ): Promise<MediaUnderstandingText> {
    const result = await resolved.understandMedia(saveId, task);
    if (!result.ok) throw gemmaFailure(result);
    return { text: result.text, model: result.model };
  }

  async function runFlorencePrimary(
    input: MediaUnderstandingRunInput,
  ): Promise<MediaUnderstandingText> {
    return {
      text: await resolved.runFlorence(input.task, input.imageUrl),
      model: resolved.florenceModelVersion(),
    };
  }

  async function runShadow(input: MediaUnderstandingRunInput): Promise<void> {
    const startedAt = resolved.now();
    let record: ShadowMediaBenchmarkRecord;
    try {
      const result = await runGemma(input.saveId, input.task);
      record = {
        task: input.task,
        provider: input.prefs.mediaUnderstandingProvider,
        modelId: boundedText(input.prefs.mediaUnderstandingModelId),
        resultModel: boundedText(gemmaModelVersion(input.task, input.prefs)),
        durationMs: boundedInteger(
          resolved.now() - startedAt,
          MAX_RECORDED_DURATION_MS,
        ),
        outcome: "ok",
        outputCharacters: boundedInteger(
          result.text.length,
          MAX_RECORDED_OUTPUT_CHARACTERS,
        ),
      };
    } catch {
      record = {
        task: input.task,
        provider: input.prefs.mediaUnderstandingProvider,
        modelId: boundedText(input.prefs.mediaUnderstandingModelId),
        durationMs: boundedInteger(
          resolved.now() - startedAt,
          MAX_RECORDED_DURATION_MS,
        ),
        outcome: "error",
      };
    }
    try {
      resolved.shadowSink.record(record);
    } catch {
      /** Shadow measurements must never affect primary enrichment. */
    }
  }

  return {
    primaryModel(task: MediaUnderstandingTask, prefs: Prefs["ai"]): string {
      return prefs.mediaUnderstandingMode === "gemma4"
        ? gemmaModelVersion(task, prefs)
        : resolved.florenceModelVersion();
    },
    async run(
      input: MediaUnderstandingRunInput,
    ): Promise<MediaUnderstandingText> {
      if (input.prefs.mediaUnderstandingMode === "gemma4") {
        try {
          return await runGemma(input.saveId, input.task);
        } catch (error) {
          if (
            input.prefs.mediaUnderstandingFallbackToFlorence &&
            error instanceof GemmaMediaUnderstandingError &&
            FALLBACK_FAILURES.has(error.reason)
          ) {
            const fallback = await runFlorencePrimary(input);
            if (error.operation) {
              try {
                resolved.operationalSink.record({
                  ...error.operation,
                  fallbackUsed: true,
                });
              } catch {
                /** Operational metrics must never affect enrichment. */
              }
            }
            return fallback;
          }
          throw error;
        }
      }

      const primary = await runFlorencePrimary(input);
      if (input.prefs.mediaUnderstandingMode === "shadow")
        void runShadow(input);
      return primary;
    },
  };
}

export type MediaUnderstandingRouter = ReturnType<
  typeof createMediaUnderstandingRouter
>;

export const mediaUnderstandingRouter = createMediaUnderstandingRouter();
