import {
  AutoProcessor,
  CLIPVisionModelWithProjection,
  env,
  pipeline,
  type RawImage,
} from "@huggingface/transformers";
import { pickDevice } from "@/lib/inference-device";
import { getPrefsSnapshot } from "@/stores/prefs";

// CLIP runtime: image embeddings (visual similarity / related / near-dup) and
// zero-shot aesthetic labelling against a fixed style vocabulary. Lazy, opt-in.

const DEFAULT_MODEL_ID = "Xenova/clip-vit-base-patch32";

function modelId(): string {
  const fromPrefs = getPrefsSnapshot()?.ai?.clipModelId;
  return fromPrefs && fromPrefs.trim().length > 0
    ? fromPrefs
    : DEFAULT_MODEL_ID;
}

export function clipModelVersion(): string {
  return `${modelId()}@1`;
}

// Fixed style vocabulary for zero-shot aesthetic tagging.
export const AESTHETIC_LABELS = [
  "minimalist",
  "maximalist",
  "vintage",
  "modern",
  "brutalist",
  "colorful",
  "monochrome",
  "dark",
  "bright",
  "illustration",
  "photograph",
  "3d render",
  "diagram",
  "screenshot",
  "typography",
] as const;

type ClipVisionModel = (inputs: Record<string, unknown>) => Promise<{
  image_embeds: { normalize: () => { tolist: () => number[][] } };
}>;

type ClipProcessor = (image: RawImage) => Promise<Record<string, unknown>>;

let visionPromise: Promise<{
  model: ClipVisionModel;
  processor: ClipProcessor;
}> | null = null;

function getVision() {
  if (!visionPromise) {
    visionPromise = (async () => {
      env.allowLocalModels = false;
      const id = modelId();
      const build = async (device: "webgpu" | "wasm") => {
        const model = (await CLIPVisionModelWithProjection.from_pretrained(id, {
          device,
          dtype: "q8",
        })) as unknown as ClipVisionModel;
        const processor = (await AutoProcessor.from_pretrained(
          id,
        )) as unknown as ClipProcessor;
        console.info(`[clip] vision ready (${device})`);
        return { model, processor };
      };
      if ((await pickDevice()) === "webgpu") {
        try {
          return await build("webgpu");
        } catch (err) {
          console.warn("[clip] WebGPU build failed; using WASM", err);
        }
      }
      return build("wasm");
    })();
    visionPromise.catch((err) => {
      console.error("[clip] failed to load vision model", err);
      visionPromise = null;
    });
  }
  return visionPromise;
}

// Normalized CLIP image embedding for visual similarity.
export async function clipImageEmbedding(
  image: RawImage,
): Promise<Float32Array> {
  const { model, processor } = await getVision();
  const inputs = await processor(image);
  const out = await model(inputs);
  const vec = out.image_embeds.normalize().tolist()[0] ?? [];
  return Float32Array.from(vec);
}

type ZeroShotClassifier = (
  image: RawImage,
  labels: string[],
) => Promise<Array<{ label: string; score: number }>>;

let zeroShotPromise: Promise<ZeroShotClassifier> | null = null;

function getZeroShot(): Promise<ZeroShotClassifier> {
  if (!zeroShotPromise) {
    zeroShotPromise = (async () => {
      env.allowLocalModels = false;
      const id = modelId();
      const build = async (device: "webgpu" | "wasm") => {
        const pipe = await pipeline("zero-shot-image-classification", id, {
          device,
          dtype: "q8",
        });
        return pipe as unknown as ZeroShotClassifier;
      };
      if ((await pickDevice()) === "webgpu") {
        try {
          return await build("webgpu");
        } catch (err) {
          console.warn(
            "[clip] WebGPU build failed (zero-shot); using WASM",
            err,
          );
        }
      }
      return build("wasm");
    })();
    zeroShotPromise.catch((err) => {
      console.error("[clip] failed to load zero-shot classifier", err);
      zeroShotPromise = null;
    });
  }
  return zeroShotPromise;
}

// Top aesthetic/style labels for an image, above a confidence floor.
export async function clipAesthetic(
  image: RawImage,
  threshold = 0.2,
  topN = 3,
): Promise<string[]> {
  const classifier = await getZeroShot();
  const out = await classifier(image, [...AESTHETIC_LABELS]);
  return out
    .filter((r) => r.score >= threshold)
    .slice(0, topN)
    .map((r) => r.label);
}
