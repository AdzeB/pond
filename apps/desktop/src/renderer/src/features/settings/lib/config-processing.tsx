import { ProcessingStatus } from "@/features/settings/components/sections/processing/processing-status";
import { defineSection } from "@/features/settings/lib/engine-types";

export const processingSection = defineSection("ai", {
  title: "Processing",
  description: "Choose which on-device details Pond adds to your saves.",
  keywords: [
    "processing",
    "caption",
    "ocr",
    "transcript",
    "clip",
    "sensitive",
    "nsfw",
    "enrichment",
  ],
  groups: [
    { title: "Overview", render: () => <ProcessingStatus /> },
    {
      title: "Details",
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
          description:
            "Find images that look alike from a Save or a dropped picture.",
          keywords: ["clip", "embeddings", "look alike", "visual match"],
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
          key: "enableSensitiveContent",
          title: "Sensitive Content",
          description: "Check images and sampled video frames on your device.",
          keywords: ["sensitive", "nsfw", "safety", "blur"],
        },
        {
          control: "switch",
          key: "blurSensitiveThumbnails",
          title: "Blur Sensitive Thumbnails",
          description: "Blur thumbnails with a likely-sensitive result.",
          keywords: ["sensitive", "nsfw", "blur", "thumbnail"],
          visible: (v) => v.enableSensitiveContent === true,
        },
        {
          control: "switch",
          key: "enableAutoTitle",
          title: "Generated Titles",
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
  ],
});
