import { env, pipeline } from "@huggingface/transformers";
import { pickDevice } from "@/lib/inference-device";
import { getPrefsSnapshot } from "@/stores/prefs";

// On-device text embeddings for semantic search and fuzzy facet resolution.
// Mirrors the lazy, WebGPU-then-WASM runtime of `lib/nsfw.ts`: a single shared
// feature-extraction pipeline, dynamically imported so it never bloats startup.

const DEFAULT_MODEL_ID = "Xenova/all-MiniLM-L6-v2";

export function embedModelId(): string {
  const fromPrefs = getPrefsSnapshot()?.ai?.embedModelId;
  return fromPrefs && fromPrefs.trim().length > 0
    ? fromPrefs
    : DEFAULT_MODEL_ID;
}

// Version stamp persisted alongside each embedding; changing the model
// invalidates stored vectors so the sweep re-embeds, mirroring nsfw's stamp.
// @2 re-embeds once caption/OCR/transcript text can be folded into the vector.
export function embedModelVersion(): string {
  return `${embedModelId()}@2`;
}

type Extractor = (
  text: string | string[],
  opts?: { pooling?: "mean" | "cls" | "none"; normalize?: boolean },
) => Promise<{ data: Float32Array; dims: number[] }>;

let extractorPromise: Promise<Extractor> | null = null;

function getExtractor(): Promise<Extractor> {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      env.allowLocalModels = false;
      const tryBuild = async (device: "webgpu" | "wasm") => {
        const pipe = await pipeline("feature-extraction", embedModelId(), {
          device,
          dtype: "q8",
        });
        console.info(`[embeddings] extractor ready (${device}/q8)`);
        return pipe as unknown as Extractor;
      };
      if ((await pickDevice()) === "webgpu") {
        try {
          return await tryBuild("webgpu");
        } catch (err) {
          console.warn("[embeddings] WebGPU build failed; using WASM", err);
        }
      }
      return tryBuild("wasm");
    })();
    extractorPromise.catch((err) => {
      console.error("[embeddings] failed to load extractor", err);
      extractorPromise = null; // allow a later retry (e.g. offline)
    });
  }
  return extractorPromise;
}

// Embed one string into a normalized vector. Mean-pooled + normalized so cosine
// similarity is a plain dot product.
export async function embedText(text: string): Promise<Float32Array> {
  const extractor = await getExtractor();
  const out = await extractor(text, { pooling: "mean", normalize: true });
  return Float32Array.from(out.data);
}

export async function embedTexts(texts: string[]): Promise<Float32Array[]> {
  if (texts.length === 0) return [];
  const extractor = await getExtractor();
  const out = await Promise.all(
    texts.map((t) => extractor(t, { pooling: "mean", normalize: true })),
  );
  return out.map((o) => Float32Array.from(o.data));
}

// Dot product of two normalized vectors == cosine similarity.
export function cosine(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i += 1)
    dot += (a[i] as number) * (b[i] as number);
  return dot;
}

// The text we embed for a save: its human-meaningful fields concatenated.
export function saveEmbeddingText(save: {
  title: string | null;
  description: string | null;
  notes: string | null;
  author: string | null;
  tags: string[];
}): string {
  return [
    save.title ?? "",
    save.description ?? "",
    save.notes ?? "",
    save.author ?? "",
    (save.tags ?? []).join(" "),
  ]
    .filter((s) => s.trim().length > 0)
    .join(" \u2014 ")
    .slice(0, 2000);
}
