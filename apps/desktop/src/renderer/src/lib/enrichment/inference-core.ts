import {
  AutoProcessor,
  AutoTokenizer,
  CLIPVisionModelWithProjection,
  env,
  Florence2ForConditionalGeneration,
  Florence2Processor,
  type PreTrainedModel,
  type PreTrainedTokenizer,
  type Processor,
  pipeline,
  type RawImage,
  Tensor,
} from "@huggingface/transformers";
import { z } from "zod";
import { pickDevice } from "@/lib/enrichment/inference-device";

export type FlorenceTask = "<CAPTION>" | "<DETAILED_CAPTION>" | "<OCR>";

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

interface FlorenceBundle {
  model: PreTrainedModel;
  processor: Florence2Processor;
  tokenizer: PreTrainedTokenizer;
}

const florenceCache = new Map<string, Promise<FlorenceBundle>>();
function getFlorence(modelId: string): Promise<FlorenceBundle> {
  return memo(florenceCache, modelId, () =>
    withDevice("florence", async (device) => {
      const model = await Florence2ForConditionalGeneration.from_pretrained(
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
      );
      const processor = await AutoProcessor.from_pretrained(modelId);
      if (!(processor instanceof Florence2Processor)) {
        throw new Error(`[florence] ${modelId} has no Florence-2 processor`);
      }
      const tokenizer = await AutoTokenizer.from_pretrained(modelId);
      console.info(`[florence] ready (${device})`);
      return { model, processor, tokenizer };
    }),
  );
}

/** Florence returns either the caption string or a boxed-region object, depending on the task. */
const CaptionSchema = z.string().catch("");

export async function coreFlorence(
  image: RawImage,
  task: FlorenceTask,
  modelId: string,
): Promise<string> {
  const { model, processor, tokenizer } = await getFlorence(modelId);
  const prompts = processor.construct_prompts(task);
  const inputs = await processor(image, prompts);
  const generated = await model.generate({
    ...inputs,
    max_new_tokens: 256,
    num_beams: 1,
    do_sample: false,
  });
  if (!(generated instanceof Tensor)) return "";
  const decoded = tokenizer.batch_decode(generated, {
    skip_special_tokens: false,
  });
  const result = processor.post_process_generation(decoded[0] ?? "", task, [
    image.width,
    image.height,
  ]);
  return CaptionSchema.parse(result[task]).trim();
}

const clipVisionCache = new Map<
  string,
  Promise<{ model: PreTrainedModel; processor: Processor }>
>();
function getClipVision(modelId: string) {
  return memo(clipVisionCache, modelId, () =>
    withDevice("clip", async (device) => {
      const model = await CLIPVisionModelWithProjection.from_pretrained(
        modelId,
        { device, dtype: "q8" },
      );
      const processor = await AutoProcessor.from_pretrained(modelId);
      console.info(`[clip] vision ready (${device})`);
      return { model, processor };
    }),
  );
}

const EmbeddingRowsSchema = z.array(z.array(z.number()));

export async function coreClipImage(
  image: RawImage,
  modelId: string,
): Promise<Float32Array> {
  const { model, processor } = await getClipVision(modelId);
  const inputs = await processor(image);
  const out = await model(inputs);
  const rows = EmbeddingRowsSchema.parse(out.image_embeds.normalize().tolist());
  return Float32Array.from(rows[0] ?? []);
}

type ZeroShotClassifier = Awaited<
  ReturnType<typeof pipeline<"zero-shot-image-classification">>
>;

const clipZeroShotCache = new Map<string, Promise<ZeroShotClassifier>>();
function getClipZeroShot(modelId: string): Promise<ZeroShotClassifier> {
  return memo(clipZeroShotCache, modelId, () =>
    withDevice("clip", (device) =>
      pipeline("zero-shot-image-classification", modelId, {
        device,
        dtype: "q8",
      }),
    ),
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

type Extractor = Awaited<ReturnType<typeof pipeline<"feature-extraction">>>;

const extractorCache = new Map<string, Promise<Extractor>>();
function getExtractor(modelId: string): Promise<Extractor> {
  return memo(extractorCache, modelId, () =>
    withDevice("embeddings", async (device) => {
      const pipe = await pipeline("feature-extraction", modelId, {
        device,
        dtype: "q8",
      });
      console.info(`[embeddings] extractor ready (${device}/q8)`);
      return pipe;
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

type Transcriber = Awaited<
  ReturnType<typeof pipeline<"automatic-speech-recognition">>
>;

const transcriberCache = new Map<string, Promise<Transcriber>>();
function getTranscriber(modelId: string): Promise<Transcriber> {
  return memo(transcriberCache, modelId, () =>
    withDevice("whisper", async (device) => {
      const pipe = await pipeline("automatic-speech-recognition", modelId, {
        device,
        dtype: device === "webgpu" ? "fp16" : "q8",
      });
      console.info(`[whisper] ready (${device})`);
      return pipe;
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
