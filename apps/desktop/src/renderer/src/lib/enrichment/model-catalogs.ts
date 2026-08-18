/** Every entry is a Transformers.js model published with ONNX weights, so it runs locally via the same pipelines as the defaults; ratings are coarse and only comparable within a catalog. */

interface ModelSpec {
  label: string;
  value: string;
}

export interface PickerModel {
  id: string;
  name: string;
  /** Provider/family heading used to group the list. */
  group: string;
  /** Relative ratings, 1 (low) to 5 (high). */
  speed: number;
  quality: number;
  multilingual?: boolean;
  /** Short right-aligned tag shown in the row, e.g. "384d" or "270 MB". */
  meta?: string;
  /** Key/value rows shown in the info panel. */
  specs: ModelSpec[];
  summary: string;
}

export interface ModelCatalog {
  defaultId: string;
  searchPlaceholder: string;
  models: readonly PickerModel[];
}

export function findModel(
  catalog: ModelCatalog,
  id: string,
): PickerModel | undefined {
  return catalog.models.find((m) => m.id === id);
}

export function groupedModels(
  models: readonly PickerModel[],
): Array<{ group: string; models: PickerModel[] }> {
  const order: string[] = [];
  const byGroup = new Map<string, PickerModel[]>();
  for (const model of models) {
    if (!byGroup.has(model.group)) {
      byGroup.set(model.group, []);
      order.push(model.group);
    }
    byGroup.get(model.group)?.push(model);
  }
  return order.map((group) => ({ group, models: byGroup.get(group) ?? [] }));
}

export const EMBEDDING_CATALOG: ModelCatalog = {
  defaultId: "Xenova/all-MiniLM-L6-v2",
  searchPlaceholder: "Search embedding models…",
  models: [
    {
      id: "Xenova/all-MiniLM-L6-v2",
      name: "MiniLM L6 v2",
      group: "Sentence Transformers",
      speed: 5,
      quality: 3,
      meta: "384d",
      specs: [
        { label: "Dimensions", value: "384" },
        { label: "Size", value: "~23 MB" },
        { label: "Languages", value: "English" },
        { label: "Pooling", value: "Mean" },
      ],
      summary: "Fast, tiny default. A strong all-rounder for short text.",
    },
    {
      id: "Xenova/all-MiniLM-L12-v2",
      name: "MiniLM L12 v2",
      group: "Sentence Transformers",
      speed: 4,
      quality: 3,
      meta: "384d",
      specs: [
        { label: "Dimensions", value: "384" },
        { label: "Size", value: "~34 MB" },
        { label: "Languages", value: "English" },
        { label: "Pooling", value: "Mean" },
      ],
      summary: "A deeper MiniLM. Slightly better quality, still small.",
    },
    {
      id: "Xenova/all-mpnet-base-v2",
      name: "MPNet Base v2",
      group: "Sentence Transformers",
      speed: 2,
      quality: 4,
      meta: "768d",
      specs: [
        { label: "Dimensions", value: "768" },
        { label: "Size", value: "~110 MB" },
        { label: "Languages", value: "English" },
        { label: "Pooling", value: "Mean" },
      ],
      summary: "Higher quality general embeddings. Larger and slower.",
    },
    {
      id: "Xenova/paraphrase-multilingual-MiniLM-L12-v2",
      name: "Multilingual MiniLM L12",
      group: "Sentence Transformers",
      speed: 3,
      quality: 3,
      multilingual: true,
      meta: "384d",
      specs: [
        { label: "Dimensions", value: "384" },
        { label: "Size", value: "~120 MB" },
        { label: "Languages", value: "Multilingual" },
        { label: "Pooling", value: "Mean" },
      ],
      summary: "MiniLM tuned for 50+ languages. Compact and broad.",
    },
    {
      id: "Xenova/bge-small-en-v1.5",
      name: "BGE Small v1.5",
      group: "BAAI · BGE",
      speed: 4,
      quality: 4,
      meta: "384d",
      specs: [
        { label: "Dimensions", value: "384" },
        { label: "Size", value: "~34 MB" },
        { label: "Languages", value: "English" },
        { label: "Pooling", value: "CLS" },
      ],
      summary: "Strong English retrieval at a small size.",
    },
    {
      id: "Xenova/bge-base-en-v1.5",
      name: "BGE Base v1.5",
      group: "BAAI · BGE",
      speed: 2,
      quality: 5,
      meta: "768d",
      specs: [
        { label: "Dimensions", value: "768" },
        { label: "Size", value: "~110 MB" },
        { label: "Languages", value: "English" },
        { label: "Pooling", value: "CLS" },
      ],
      summary: "Top English retrieval quality. Heavier and slower.",
    },
    {
      id: "Xenova/gte-small",
      name: "GTE Small",
      group: "Alibaba · GTE",
      speed: 4,
      quality: 4,
      meta: "384d",
      specs: [
        { label: "Dimensions", value: "384" },
        { label: "Size", value: "~34 MB" },
        { label: "Languages", value: "English" },
        { label: "Pooling", value: "Mean" },
      ],
      summary: "Strong general embeddings in a compact model.",
    },
    {
      id: "Xenova/gte-base",
      name: "GTE Base",
      group: "Alibaba · GTE",
      speed: 2,
      quality: 4,
      meta: "768d",
      specs: [
        { label: "Dimensions", value: "768" },
        { label: "Size", value: "~110 MB" },
        { label: "Languages", value: "English" },
        { label: "Pooling", value: "Mean" },
      ],
      summary: "Higher capacity GTE for better recall.",
    },
    {
      id: "Xenova/multilingual-e5-small",
      name: "Multilingual E5 Small",
      group: "intfloat · E5",
      speed: 3,
      quality: 3,
      multilingual: true,
      meta: "384d",
      specs: [
        { label: "Dimensions", value: "384" },
        { label: "Size", value: "~120 MB" },
        { label: "Languages", value: "Multilingual" },
        { label: "Pooling", value: "Mean" },
      ],
      summary:
        "Multilingual retrieval, compact. Best for non-English libraries.",
    },
    {
      id: "Xenova/multilingual-e5-base",
      name: "Multilingual E5 Base",
      group: "intfloat · E5",
      speed: 2,
      quality: 4,
      multilingual: true,
      meta: "768d",
      specs: [
        { label: "Dimensions", value: "768" },
        { label: "Size", value: "~280 MB" },
        { label: "Languages", value: "Multilingual" },
        { label: "Pooling", value: "Mean" },
      ],
      summary: "Multilingual retrieval at higher quality. Large download.",
    },
  ],
};

export const CAPTION_CATALOG: ModelCatalog = {
  defaultId: "onnx-community/Florence-2-base-ft",
  searchPlaceholder: "Search caption models…",
  models: [
    {
      id: "onnx-community/Florence-2-base-ft",
      name: "Florence-2 Base",
      group: "Florence-2",
      speed: 4,
      quality: 4,
      meta: "270 MB",
      specs: [
        { label: "Size", value: "~270 MB" },
        { label: "Tasks", value: "Caption + Text" },
        { label: "Tuning", value: "Fine-tuned" },
      ],
      summary:
        "Default. Fine-tuned base model with good captions and text in images.",
    },
    {
      id: "onnx-community/Florence-2-large-ft",
      name: "Florence-2 Large",
      group: "Florence-2",
      speed: 2,
      quality: 5,
      meta: "770 MB",
      specs: [
        { label: "Size", value: "~770 MB" },
        { label: "Tasks", value: "Caption + Text" },
        { label: "Tuning", value: "Fine-tuned" },
      ],
      summary: "Best quality. Large download and slow first run.",
    },
  ],
};

export const CLIP_CATALOG: ModelCatalog = {
  defaultId: "Xenova/clip-vit-base-patch32",
  searchPlaceholder: "Search models…",
  models: [
    {
      id: "Xenova/clip-vit-base-patch32",
      name: "CLIP ViT-B/32",
      group: "Visual",
      speed: 5,
      quality: 3,
      meta: "512d",
      specs: [
        { label: "Dimensions", value: "512" },
        { label: "Patch size", value: "32" },
        { label: "Size", value: "~150 MB" },
      ],
      summary:
        "Default. Fast image embeddings for visual search and de-duping.",
    },
    {
      id: "Xenova/clip-vit-base-patch16",
      name: "CLIP ViT-B/16",
      group: "Visual",
      speed: 3,
      quality: 4,
      meta: "512d",
      specs: [
        { label: "Dimensions", value: "512" },
        { label: "Patch size", value: "16" },
        { label: "Size", value: "~150 MB" },
      ],
      summary: "Finer patches catch more detail. Slower than patch32.",
    },
    {
      id: "Xenova/clip-vit-large-patch14",
      name: "CLIP ViT-L/14",
      group: "Visual",
      speed: 2,
      quality: 5,
      meta: "768d",
      specs: [
        { label: "Dimensions", value: "768" },
        { label: "Patch size", value: "14" },
        { label: "Size", value: "~600 MB" },
      ],
      summary: "Highest quality embeddings. Large download, slow on CPU.",
    },
  ],
};

export const WHISPER_CATALOG: ModelCatalog = {
  defaultId: "Xenova/whisper-tiny",
  searchPlaceholder: "Search transcription models…",
  models: [
    {
      id: "Xenova/whisper-tiny",
      name: "Whisper Tiny",
      group: "Transcription",
      speed: 5,
      quality: 2,
      multilingual: true,
      meta: "40 MB",
      specs: [
        { label: "Size", value: "~40 MB" },
        { label: "Parameters", value: "39M" },
        { label: "Languages", value: "Multilingual" },
      ],
      summary: "Default. Fastest, lowest accuracy. Fine for short clips.",
    },
    {
      id: "Xenova/whisper-tiny.en",
      name: "Whisper Tiny",
      group: "Transcription",
      speed: 5,
      quality: 2,
      meta: "English · 40 MB",
      specs: [
        { label: "Size", value: "~40 MB" },
        { label: "Parameters", value: "39M" },
        { label: "Languages", value: "English" },
      ],
      summary:
        "English-only tiny. A bit better on English than the multilingual tiny.",
    },
    {
      id: "Xenova/whisper-base",
      name: "Whisper Base",
      group: "Transcription",
      speed: 4,
      quality: 3,
      multilingual: true,
      meta: "80 MB",
      specs: [
        { label: "Size", value: "~80 MB" },
        { label: "Parameters", value: "74M" },
        { label: "Languages", value: "Multilingual" },
      ],
      summary: "Balanced size and accuracy.",
    },
    {
      id: "Xenova/whisper-base.en",
      name: "Whisper Base",
      group: "Transcription",
      speed: 4,
      quality: 3,
      meta: "English · 80 MB",
      specs: [
        { label: "Size", value: "~80 MB" },
        { label: "Parameters", value: "74M" },
        { label: "Languages", value: "English" },
      ],
      summary:
        "English-only base. Better English accuracy than multilingual base.",
    },
    {
      id: "Xenova/whisper-small",
      name: "Whisper Small",
      group: "Transcription",
      speed: 2,
      quality: 4,
      multilingual: true,
      meta: "250 MB",
      specs: [
        { label: "Size", value: "~250 MB" },
        { label: "Parameters", value: "244M" },
        { label: "Languages", value: "Multilingual" },
      ],
      summary: "Higher accuracy. Heavy and slow on CPU.",
    },
    {
      id: "Xenova/whisper-small.en",
      name: "Whisper Small",
      group: "Transcription",
      speed: 2,
      quality: 4,
      meta: "English · 250 MB",
      specs: [
        { label: "Size", value: "~250 MB" },
        { label: "Parameters", value: "244M" },
        { label: "Languages", value: "English" },
      ],
      summary: "English-only small. Strong English accuracy, heavy.",
    },
  ],
};
