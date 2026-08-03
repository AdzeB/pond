import { Settings } from "@pond/ui";
import { EnrichmentModelPicker } from "@/components/shared/enrichment-model-picker";
import {
  CAPTION_CATALOG,
  CLIP_CATALOG,
  type ModelCatalog,
  WHISPER_CATALOG,
} from "@/lib/enrichment/model-catalogs";
import { type Binding, defineSection } from "@/lib/settings/engine-types";

interface EnrichValues {
  captionModelId?: string;
  clipModelId?: string;
  whisperModelId?: string;
}

function ModelPickerRow({
  binding,
  title,
  description,
  catalog,
  field,
}: {
  binding: Binding;
  title: string;
  description: string;
  catalog: ModelCatalog;
  field: keyof EnrichValues;
}) {
  const values = binding.values as EnrichValues;
  return (
    <>
      <Settings.ItemDetails>
        <Settings.ItemTitle>{title}</Settings.ItemTitle>
        <Settings.ItemDescription>{description}</Settings.ItemDescription>
      </Settings.ItemDetails>
      <Settings.ItemControl>
        <EnrichmentModelPicker
          catalog={catalog}
          value={values[field] ?? ""}
          onChange={(id) => binding.patch({ [field]: id })}
        />
      </Settings.ItemControl>
    </>
  );
}

export const enrichmentSection = defineSection("ai", {
  title: "Enrichment",
  description:
    "On-device models that caption, transcribe, and label your saves.",
  groups: [
    {
      title: "Features",
      items: [
        {
          control: "switch",
          key: "enableCaption",
          title: "Image Captions",
          description: "Caption images with Florence-2. Large first download.",
          keywords: ["florence", "vision", "describe"],
        },
        {
          control: "switch",
          key: "enableOcr",
          title: "Text in Images (OCR)",
          description: "Read text in images with Florence-2.",
          keywords: ["ocr", "recognition", "florence"],
        },
        {
          control: "switch",
          key: "enableTranscript",
          title: "Transcribe Audio & Video",
          description:
            "Transcribe video and audio with Whisper. Runs in the background.",
          keywords: ["whisper", "speech", "captions", "subtitles"],
        },
        {
          control: "switch",
          key: "enableClip",
          title: "Visual Similarity (CLIP)",
          description:
            "Embed images with CLIP for visual search and duplicate detection.",
          keywords: ["clip", "embeddings", "duplicates"],
        },
        {
          control: "switch",
          key: "enableAesthetic",
          title: "Aesthetic & Style Labels",
          description:
            "Label image styles like minimalist or vintage with CLIP.",
          keywords: ["style", "aesthetic", "labels", "clip"],
        },
        {
          control: "switch",
          key: "enableAutoTitle",
          title: "Auto-Title",
          description:
            "Fill empty titles from captions or text. Never overwrites edits.",
          keywords: ["title", "automatic", "naming"],
        },
        {
          control: "switch",
          key: "enableSuggestedTags",
          title: "Suggested Tags",
          description:
            "Suggest existing tags by meaning. Needs semantic search. Apply them in bulk from Tasks.",
          keywords: ["tags", "suggestions", "auto-tag"],
        },
      ],
    },
    {
      title: "Models",
      items: [
        {
          control: "custom",
          key: "captionModelId",
          title: "Caption / OCR Model",
          keywords: ["florence", "model", "caption", "ocr"],
          render: (binding) => (
            <ModelPickerRow
              binding={binding}
              title="Caption / OCR Model"
              description="Florence-2 model for captions and OCR."
              catalog={CAPTION_CATALOG}
              field="captionModelId"
            />
          ),
        },
        {
          control: "custom",
          key: "clipModelId",
          title: "CLIP Model",
          keywords: ["clip", "model", "embeddings"],
          render: (binding) => (
            <ModelPickerRow
              binding={binding}
              title="CLIP Model"
              description="Model for image embeddings and style labels."
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
          render: (binding) => (
            <ModelPickerRow
              binding={binding}
              title="Transcription Model"
              description="Whisper model for speech-to-text."
              catalog={WHISPER_CATALOG}
              field="whisperModelId"
            />
          ),
        },
      ],
    },
  ],
});
