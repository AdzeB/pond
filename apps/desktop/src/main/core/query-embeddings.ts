import type {
  FeatureExtractionPipeline,
  PreTrainedTokenizer,
  SiglipTextModel,
} from "@huggingface/transformers";
import type { MediaType, Prefs } from "@pond/schema/db";
import {
  clipEmbeddingVersion,
  textEmbeddingVersion,
} from "../../shared/embeddings";
import {
  TEXT_EMBEDDING_MODEL,
  VISUAL_MODEL,
} from "../../shared/on-device-models";
import { getPrefs } from "./prefs";

export interface VersionedVector {
  model: string;
  vector: number[];
}

export interface QueryEmbeddings {
  text?: VersionedVector;
  visual?: VersionedVector;
}

interface Disposable {
  dispose(): void | Promise<void>;
}
interface ClipTextBundle {
  tokenizer: PreTrainedTokenizer;
  model: SiglipTextModel;
  dispose(): Promise<void>;
}
const textCache = new Map<string, Promise<FeatureExtractionPipeline>>();
const clipCache = new Map<string, Promise<ClipTextBundle>>();
const MODEL_CACHE_LIMIT = 2;

function memo<T extends Disposable>(
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
    const oldest = cache.entries().next().value;
    if (oldest && oldest[0] !== key) {
      cache.delete(oldest[0]);
      void oldest[1].then(
        (value) => value.dispose(),
        () => undefined,
      );
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

async function textExtractor(): Promise<FeatureExtractionPipeline> {
  return memo(textCache, TEXT_EMBEDDING_MODEL.revision, async () => {
    const transformers = await import("@huggingface/transformers");
    transformers.env.allowLocalModels = false;
    return transformers.pipeline(
      "feature-extraction",
      TEXT_EMBEDDING_MODEL.id,
      {
        revision: TEXT_EMBEDDING_MODEL.revision,
        device: "wasm",
        dtype: "q8",
      },
    );
  });
}

async function clipTextBundle(): Promise<ClipTextBundle> {
  return memo(clipCache, VISUAL_MODEL.revision, async () => {
    const transformers = await import("@huggingface/transformers");
    transformers.env.allowLocalModels = false;
    const [tokenizer, model] = await Promise.all([
      transformers.AutoTokenizer.from_pretrained(VISUAL_MODEL.id, {
        revision: VISUAL_MODEL.revision,
      }),
      transformers.SiglipTextModel.from_pretrained(VISUAL_MODEL.id, {
        revision: VISUAL_MODEL.revision,
        device: "wasm",
        dtype: "q8",
      }),
    ]);
    return {
      tokenizer,
      model,
      dispose: async () => {
        await model.dispose();
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
        const extractor = await textExtractor();
        const output = await extractor(trimmed, {
          pooling: "mean",
          normalize: true,
        });
        return {
          model: textEmbeddingVersion(),
          vector: normalize(Array.from(output.data, Number)),
        };
      })()
    : undefined;
  const visual =
    resolvedPrefs.ai.enableClip && (!media.length || media.includes("image"))
      ? (async (): Promise<VersionedVector> => {
          const bundle = await clipTextBundle();
          const inputs = bundle.tokenizer([trimmed], {
            padding: "max_length",
            truncation: true,
          });
          const output = await bundle.model(inputs);
          return {
            model: clipEmbeddingVersion(),
            vector: normalize(Array.from(output.pooler_output.data, Number)),
          };
        })()
      : undefined;
  const [textResult, visualResult] = await Promise.all([text, visual]);
  const result: QueryEmbeddings = {};
  if (textResult) result.text = textResult;
  if (visualResult) result.visual = visualResult;
  return result;
}
