import {
  AutoProcessor,
  AutoTokenizer,
  CLIPVisionModelWithProjection,
  env,
  Florence2ForConditionalGeneration,
  pipeline,
  type RawImage,
} from "@huggingface/transformers";
import { pickDevice } from "@/lib/enrichment/inference-device";

/**
 * Shared transformers.js model host, intentionally free of DOM and prefs access so it runs unchanged in the inference Web Worker and on the main thread as a fallback.
 * @remarks Models are cached per id so a prefs override loads a second model rather than thrashing the default.
 */

export type FlorenceTask = "<CAPTION>" | "<DETAILED_CAPTION>" | "<OCR>";

/** Builds on WebGPU when available, falling back to WASM. */
async function withDevice<T>(
  tag: string,
  build: (device: "webgpu" | "wasm") => Promise<T>,
): Promise<T> {
  env.allowLocalModels = false;
  if ((await pickDevice()) === "webgpu") {
    try {
      return await build("webgpu");
    } catch (err) {
      console.warn(`[${tag}] WebGPU build failed; using WASM`, err);
    }
  }
  return build("wasm");
}

/** Clears the cache entry on failure so an offline/transient load can be retried on the next call. */
function memo<T>(
  cache: Map<string, Promise<T>>,
  key: string,
  load: () => Promise<T>,
): Promise<T> {
  const existing = cache.get(key);
  if (existing) return existing;
  const p = load();
  cache.set(key, p);
  p.catch(() => cache.delete(key));
  return p;
}

interface FlorenceProcessor {
  construct_prompts: (task: string) => string | string[];
  post_process_generation: (
    text: string,
    task: string,
    imageSize: [number, number],
  ) => Record<string, unknown>;
  (
    image: RawImage,
    prompts: string | string[],
  ): Promise<Record<string, unknown>>;
}

interface FlorenceModel {
  generate: (opts: Record<string, unknown>) => Promise<unknown>;
}

interface FlorenceTokenizer {
  batch_decode: (
    ids: unknown,
    opts?: { skip_special_tokens?: boolean },
  ) => string[];
}

interface FlorenceBundle {
  model: FlorenceModel;
  processor: FlorenceProcessor;
  tokenizer: FlorenceTokenizer;
}

const florenceCache = new Map<string, Promise<FlorenceBundle>>();
function getFlorence(modelId: string): Promise<FlorenceBundle> {
  return memo(florenceCache, modelId, () =>
    withDevice("florence", async (device) => {
      const model = (await Florence2ForConditionalGeneration.from_pretrained(
        modelId,
        {
          device,
          dtype:
            device === "webgpu"
              ? {
                  embed_tokens: "fp16",
                  vision_encoder: "fp16",
                  encoder_model: "fp16",
                  decoder_model_merged: "q4",
                }
              : "q8",
        },
      )) as unknown as FlorenceModel;
      const processor = (await AutoProcessor.from_pretrained(
        modelId,
      )) as unknown as FlorenceProcessor;
      const tokenizer = (await AutoTokenizer.from_pretrained(
        modelId,
      )) as unknown as FlorenceTokenizer;
      console.info(`[florence] ready (${device})`);
      return { model, processor, tokenizer };
    }),
  );
}

export async function coreFlorence(
  image: RawImage,
  task: FlorenceTask,
  modelId: string,
): Promise<string> {
  const { model, processor, tokenizer } = await getFlorence(modelId);
  const prompts = processor.construct_prompts(task);
  const inputs = await processor(image, prompts);
  const generatedIds = await model.generate({
    ...(inputs as Record<string, unknown>),
    max_new_tokens: 256,
    num_beams: 1,
    do_sample: false,
  });
  const decoded = tokenizer.batch_decode(generatedIds, {
    skip_special_tokens: false,
  });
  const text = decoded[0] ?? "";
  const result = processor.post_process_generation(text, task, [
    image.width,
    image.height,
  ]);
  const value = result[task];
  return typeof value === "string" ? value.trim() : "";
}

type ClipVisionModel = (inputs: Record<string, unknown>) => Promise<{
  image_embeds: { normalize: () => { tolist: () => number[][] } };
}>;
type ClipProcessor = (image: RawImage) => Promise<Record<string, unknown>>;

const clipVisionCache = new Map<
  string,
  Promise<{ model: ClipVisionModel; processor: ClipProcessor }>
>();
function getClipVision(modelId: string) {
  return memo(clipVisionCache, modelId, () =>
    withDevice("clip", async (device) => {
      const model = (await CLIPVisionModelWithProjection.from_pretrained(
        modelId,
        { device, dtype: "q8" },
      )) as unknown as ClipVisionModel;
      const processor = (await AutoProcessor.from_pretrained(
        modelId,
      )) as unknown as ClipProcessor;
      console.info(`[clip] vision ready (${device})`);
      return { model, processor };
    }),
  );
}

export async function coreClipImage(
  image: RawImage,
  modelId: string,
): Promise<Float32Array> {
  const { model, processor } = await getClipVision(modelId);
  const inputs = await processor(image);
  const out = await model(inputs);
  const vec = out.image_embeds.normalize().tolist()[0] ?? [];
  return Float32Array.from(vec);
}

type ZeroShotClassifier = (
  image: RawImage,
  labels: string[],
) => Promise<Array<{ label: string; score: number }>>;

const clipZeroShotCache = new Map<string, Promise<ZeroShotClassifier>>();
function getClipZeroShot(modelId: string): Promise<ZeroShotClassifier> {
  return memo(clipZeroShotCache, modelId, () =>
    withDevice("clip", async (device) => {
      const pipe = await pipeline("zero-shot-image-classification", modelId, {
        device,
        dtype: "q8",
      });
      return pipe as unknown as ZeroShotClassifier;
    }),
  );
}

export async function coreClipAesthetic(
  image: RawImage,
  labels: string[],
  modelId: string,
  threshold = 0.2,
  topN = 3,
): Promise<string[]> {
  const classifier = await getClipZeroShot(modelId);
  const out = await classifier(image, labels);
  return out
    .filter((r) => r.score >= threshold)
    .slice(0, topN)
    .map((r) => r.label);
}

type Extractor = (
  text: string | string[],
  opts?: { pooling?: "mean" | "cls" | "none"; normalize?: boolean },
) => Promise<{ data: Float32Array; dims: number[] }>;

const extractorCache = new Map<string, Promise<Extractor>>();
function getExtractor(modelId: string): Promise<Extractor> {
  return memo(extractorCache, modelId, () =>
    withDevice("embeddings", async (device) => {
      const pipe = await pipeline("feature-extraction", modelId, {
        device,
        dtype: "q8",
      });
      console.info(`[embeddings] extractor ready (${device}/q8)`);
      return pipe as unknown as Extractor;
    }),
  );
}

export async function coreEmbedText(
  text: string,
  modelId: string,
): Promise<Float32Array> {
  const extractor = await getExtractor(modelId);
  const out = await extractor(text, { pooling: "mean", normalize: true });
  return Float32Array.from(out.data);
}

export async function coreEmbedTexts(
  texts: string[],
  modelId: string,
): Promise<Float32Array[]> {
  if (texts.length === 0) return [];
  const extractor = await getExtractor(modelId);
  const out = await Promise.all(
    texts.map((t) => extractor(t, { pooling: "mean", normalize: true })),
  );
  return out.map((o) => Float32Array.from(o.data));
}

type Transcriber = (
  audio: Float32Array,
  opts?: Record<string, unknown>,
) => Promise<{ text: string } | Array<{ text: string }>>;

const transcriberCache = new Map<string, Promise<Transcriber>>();
function getTranscriber(modelId: string): Promise<Transcriber> {
  return memo(transcriberCache, modelId, () =>
    withDevice("whisper", async (device) => {
      const pipe = await pipeline("automatic-speech-recognition", modelId, {
        device,
        dtype: device === "webgpu" ? "fp16" : "q8",
      });
      console.info(`[whisper] ready (${device})`);
      return pipe as unknown as Transcriber;
    }),
  );
}

export async function coreTranscribe(
  audio: Float32Array,
  modelId: string,
): Promise<string> {
  const transcriber = await getTranscriber(modelId);
  const out = await transcriber(audio, {
    chunk_length_s: 30,
    stride_length_s: 5,
  });
  const text = Array.isArray(out) ? out.map((o) => o.text).join(" ") : out.text;
  return (text ?? "").trim();
}
