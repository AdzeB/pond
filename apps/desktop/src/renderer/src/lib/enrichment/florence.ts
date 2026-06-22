import {
  AutoProcessor,
  AutoTokenizer,
  env,
  Florence2ForConditionalGeneration,
  type RawImage,
} from "@huggingface/transformers";
import { getPrefsSnapshot } from "@/stores/prefs";

// Florence-2 runtime: one vision-language model serving both captioning and OCR.
// Lazy, opt-in, WebGPU-then-WASM, mirroring lib/embeddings.ts. Heavy download, so
// the caption/ocr enrichers default OFF (see packages/schema/src/prefs.ts).

// onnx-community ships the ONNX weights transformers.js needs; overridable via prefs.
const DEFAULT_MODEL_ID = "onnx-community/Florence-2-base-ft";

export type FlorenceTask = "<CAPTION>" | "<DETAILED_CAPTION>" | "<OCR>";

function modelId(): string {
  const fromPrefs = getPrefsSnapshot()?.ai?.captionModelId;
  return fromPrefs && fromPrefs.trim().length > 0
    ? fromPrefs
    : DEFAULT_MODEL_ID;
}

export function florenceModelVersion(): string {
  return `${modelId()}@1`;
}

// transformers.js processors/models carry methods the published types don't fully
// surface; describe just what we call and cast at the boundary.
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

let bundlePromise: Promise<FlorenceBundle> | null = null;

function getFlorence(): Promise<FlorenceBundle> {
  if (!bundlePromise) {
    bundlePromise = (async () => {
      env.allowLocalModels = false;
      const id = modelId();
      const build = async (
        device: "webgpu" | "wasm",
      ): Promise<FlorenceBundle> => {
        const model = (await Florence2ForConditionalGeneration.from_pretrained(
          id,
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
          id,
        )) as unknown as FlorenceProcessor;
        const tokenizer = (await AutoTokenizer.from_pretrained(
          id,
        )) as unknown as FlorenceTokenizer;
        console.info(`[florence] ready (${device})`);
        return { model, processor, tokenizer };
      };
      if (typeof navigator !== "undefined" && "gpu" in navigator) {
        try {
          return await build("webgpu");
        } catch (err) {
          console.warn("[florence] WebGPU unavailable; using WASM", err);
        }
      }
      return build("wasm");
    })();
    bundlePromise.catch((err) => {
      console.error("[florence] failed to load", err);
      bundlePromise = null;
    });
  }
  return bundlePromise;
}

// Run one Florence task over an image, returning the decoded text (or "").
export async function runFlorence(
  image: RawImage,
  task: FlorenceTask,
): Promise<string> {
  const { model, processor, tokenizer } = await getFlorence();
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
