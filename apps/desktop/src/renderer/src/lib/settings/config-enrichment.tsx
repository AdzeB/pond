import { Settings } from "@pond/ui";
import { z } from "zod";
import { EnrichmentModelPicker } from "@/components/shared/enrichment-model-picker";
import {
  CAPTION_CATALOG,
  CLIP_CATALOG,
  EMBEDDING_CATALOG,
  type ModelCatalog,
  WHISPER_CATALOG,
} from "@/lib/enrichment/model-catalogs";
import { type Binding, defineSection } from "@/lib/settings/engine-types";

const ModelIdSchema = z.string().catch("");

type ModelField =
  | "embedModelId"
  | "captionModelId"
  | "clipModelId"
  | "whisperModelId";

function ModelPickerRow({
  binding,
  title,
  description,
  catalog,
  field,
}: {
  binding: Binding;
  title: string;
  description?: string;
  catalog: ModelCatalog;
  field: ModelField;
}) {
  return (
    <>
      <Settings.ItemDetails>
        <Settings.ItemTitle>{title}</Settings.ItemTitle>
        {description ? (
          <Settings.ItemDescription>{description}</Settings.ItemDescription>
        ) : null}
      </Settings.ItemDetails>
      <Settings.ItemControl>
        <EnrichmentModelPicker
          catalog={catalog}
          value={ModelIdSchema.parse(binding.values[field])}
          onChange={(id) => binding.patch({ [field]: id })}
        />
      </Settings.ItemControl>
    </>
  );
}

export const enrichmentSection = defineSection("ai", {
  title: "Enrichments",
  description: "Search, caption, and transcribe saves on-device.",
  groups: [
    {
      title: "Search",
      items: [
        {
          control: "switch",
          key: "nlCompiler",
          title: "Natural-Language Search",
          description:
            "Turn questions into filters. Uses your Agent model, or Minnow.",
          keywords: [
            "nlp",
            "query",
            "ask",
            "minnow",
            "llama",
            "on-device",
            "natural language",
          ],
        },
        {
          control: "switch",
          key: "semanticSearch",
          title: "Semantic Search",
          description: "Rank results by meaning.",
          keywords: ["embeddings", "meaning", "vector", "similarity"],
        },
        {
          control: "custom",
          key: "embedModelId",
          title: "Embedding Model",
          keywords: ["embeddings", "model", "on-device"],
          visible: (v) => v.semanticSearch === true,
          render: (binding) => (
            <ModelPickerRow
              binding={binding}
              title="Embedding Model"
              catalog={EMBEDDING_CATALOG}
              field="embedModelId"
            />
          ),
        },
      ],
    },
    {
      title: "Media",
      items: [
        {
          control: "switch",
          key: "enableCaption",
          title: "Image Captions",
          description: "Describe images. Large first download.",
          keywords: ["florence", "vision", "describe"],
        },
        {
          control: "switch",
          key: "enableOcr",
          title: "Text in Images",
          description: "Read text in screenshots and photos.",
          keywords: ["ocr", "recognition", "florence"],
        },
        {
          control: "switch",
          key: "enableTranscript",
          title: "Transcription",
          description: "Transcribe video and audio.",
          keywords: ["whisper", "speech", "captions", "subtitles"],
        },
        {
          control: "switch",
          key: "enableClip",
          title: "Visual Similarity",
          description: "Find similar images and duplicates.",
          keywords: ["clip", "embeddings", "duplicates"],
        },
        {
          control: "switch",
          key: "enableAesthetic",
          title: "Style Labels",
          description: "Label styles like minimalist or vintage.",
          keywords: ["style", "aesthetic", "labels", "clip"],
          visible: (v) => v.enableClip === true,
        },
        {
          control: "switch",
          key: "enableAutoTitle",
          title: "Auto-Title",
          description: "Fill empty titles. Never overwrites edits.",
          keywords: ["title", "automatic", "naming"],
          visible: (v) => v.enableCaption === true || v.enableOcr === true,
        },
        {
          control: "switch",
          key: "enableSuggestedTags",
          title: "Suggested Tags",
          description: "Suggest tags from your library. You apply them.",
          keywords: ["tags", "suggestions", "auto-tag"],
          visible: (v) => v.semanticSearch === true,
        },
      ],
    },
    {
      title: "Models",
      items: [
        {
          control: "custom",
          key: "captionModelId",
          title: "Image Model",
          keywords: ["florence", "model", "caption", "ocr"],
          visible: (v) => v.enableCaption === true || v.enableOcr === true,
          render: (binding) => (
            <ModelPickerRow
              binding={binding}
              title="Image Model"
              description="Used for captions and text in images."
              catalog={CAPTION_CATALOG}
              field="captionModelId"
            />
          ),
        },
        {
          control: "custom",
          key: "clipModelId",
          title: "Visual Model",
          keywords: ["clip", "model", "embeddings"],
          visible: (v) => v.enableClip === true || v.enableAesthetic === true,
          render: (binding) => (
            <ModelPickerRow
              binding={binding}
              title="Visual Model"
              catalog={CLIP_CATALOG}
              field="clipModelId"
            />
          ),
        },
        {
          control: "custom",
          key: "whisperModelId",
          title: "Transcription Model",
          keywords: ["whisper", "model", "speech"],
          visible: (v) => v.enableTranscript === true,
          render: (binding) => (
            <ModelPickerRow
              binding={binding}
              title="Transcription Model"
              catalog={WHISPER_CATALOG}
              field="whisperModelId"
            />
          ),
        },
      ],
    },
  ],
});
