import type { MediaType, Prefs } from "@pond/schema/db";
import {
  clipEmbeddingVersion,
  DEFAULT_CLIP_MODEL,
  DEFAULT_TEXT_EMBEDDING_MODEL,
  textEmbeddingVersion,
} from "../../shared/embeddings";
import { getPrefs } from "./prefs";

export interface VersionedVector {
  model: string;
  vector: number[];
}

export interface QueryEmbeddings {
  text?: VersionedVector;
  visual?: VersionedVector;
}

type TextExtractor = (
  text: string,
  options: { pooling: "mean"; normalize: true },
) => Promise<{ data: Float32Array }>;

type Disposable = { dispose?: () => void | Promise<void> };

type ClipTextBundle = {
  tokenizer: (
    texts: string[],
    options: { padding: true; truncation: true },
  ) => Record<string, unknown>;
  model: (
    inputs: Record<string, unknown>,
  ) => Promise<{ text_embeds: { data: Float32Array } }>;
  dispose: () => Promise<void>;
};

const textCache = new Map<string, Promise<TextExtractor & Disposable>>();
const clipCache = new Map<string, Promise<ClipTextBundle>>();
const MODEL_CACHE_LIMIT = 2;

function dispose(value: unknown): Promise<void> {
  const candidate = value as Disposable;
  return Promise.resolve(candidate.dispose?.()).then(() => undefined);
}

function memo<T>(
  cache: Map<string, Promise<T>>,
  key: string,
  load: () => Promise<T>,
): Promise<T> {
  const existing = cache.get(key);
  if (existing) return existing;
  const pending = load();
  cache.set(key, pending);
  pending.catch(() => cache.delete(key));
  if (cache.size > MODEL_CACHE_LIMIT) {
    const oldest = cache.entries().next().value as
      | [string, Promise<T>]
      | undefined;
    if (oldest && oldest[0] !== key) {
      cache.delete(oldest[0]);
      void oldest[1].then(dispose, () => undefined);
    }
  }
  return pending;
}

function normalize(vector: ArrayLike<number>): number[] {
  let magnitude = 0;
  for (let index = 0; index < vector.length; index++) {
    const value = vector[index] ?? 0;
    magnitude += value * value;
  }
  const divisor = Math.sqrt(magnitude);
  if (!divisor) return Array.from(vector);
  return Array.from(vector, (value) => value / divisor);
}

async function textExtractor(
  modelId: string,
): Promise<TextExtractor & Disposable> {
  return memo(textCache, modelId, async () => {
    const transformers = await import("@huggingface/transformers");
    transformers.env.allowLocalModels = false;
    return (await transformers.pipeline("feature-extraction", modelId, {
      device: "wasm",
      dtype: "q8",
    })) as unknown as TextExtractor & Disposable;
  });
}

async function clipTextBundle(modelId: string): Promise<ClipTextBundle> {
  return memo(clipCache, modelId, async () => {
    const transformers = await import("@huggingface/transformers");
    transformers.env.allowLocalModels = false;
    const [tokenizer, model] = await Promise.all([
      transformers.AutoTokenizer.from_pretrained(modelId),
      transformers.CLIPTextModelWithProjection.from_pretrained(modelId, {
        device: "wasm",
        dtype: "q8",
      }),
    ]);
    return {
      tokenizer: tokenizer as unknown as ClipTextBundle["tokenizer"],
      model: model as unknown as ClipTextBundle["model"],
      dispose: async () => {
        await Promise.all([dispose(tokenizer), dispose(model)]);
      },
    };
  });
}

export function cosineSimilarity(
  left: ArrayLike<number>,
  right: ArrayLike<number>,
): number | null {
  if (!left.length || left.length !== right.length) return null;
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < left.length; index++) {
    const a = left[index] ?? 0;
    const b = right[index] ?? 0;
    dot += a * b;
    leftMagnitude += a * a;
    rightMagnitude += b * b;
  }
  if (!leftMagnitude || !rightMagnitude) return null;
  return dot / Math.sqrt(leftMagnitude * rightMagnitude);
}

export function reciprocalRankFusion(
  rankedLists: string[][],
  k = 60,
): Array<{ id: string; score: number }> {
  const scores = new Map<string, number>();
  for (const list of rankedLists) {
    for (const [index, id] of [...new Set(list)].entries()) {
      scores.set(id, (scores.get(id) ?? 0) + 1 / (k + index + 1));
    }
  }
  return [...scores]
    .map(([id, score]) => ({ id, score }))
    .sort(
      (left, right) =>
        right.score - left.score || left.id.localeCompare(right.id),
    );
}

export async function encodeQueryEmbeddings(
  query: string,
  media: MediaType[],
  prefs?: Pick<Prefs, "ai">,
): Promise<QueryEmbeddings> {
  const trimmed = query.trim();
  if (!trimmed) return {};
  const resolvedPrefs = prefs ?? (await getPrefs());
  const text = resolvedPrefs.ai.semanticSearch
    ? (async (): Promise<VersionedVector> => {
        const modelId =
          resolvedPrefs.ai.embedModelId.trim() || DEFAULT_TEXT_EMBEDDING_MODEL;
        const extractor = await textExtractor(modelId);
        const output = await extractor(trimmed, {
          pooling: "mean",
          normalize: true,
        });
        return {
          model: textEmbeddingVersion(modelId),
          vector: normalize(output.data),
        };
      })()
    : undefined;
  const visual =
    resolvedPrefs.ai.enableClip && (!media.length || media.includes("image"))
      ? (async (): Promise<VersionedVector> => {
          const modelId =
            resolvedPrefs.ai.clipModelId.trim() || DEFAULT_CLIP_MODEL;
          const bundle = await clipTextBundle(modelId);
          const inputs = bundle.tokenizer([trimmed], {
            padding: true,
            truncation: true,
          });
          const output = await bundle.model(inputs);
          return {
            model: clipEmbeddingVersion(modelId),
            vector: normalize(output.text_embeds.data),
          };
        })()
      : undefined;
  const [textResult, visualResult] = await Promise.all([text, visual]);
  return {
    ...(textResult ? { text: textResult } : {}),
    ...(visualResult ? { visual: visualResult } : {}),
  };
}
