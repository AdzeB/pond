import { useImageDownloadBinding } from "@/features/settings/components/sections/downloads";
import {
  defineCustomSection,
  group,
  type SettingsValues,
} from "@/features/settings/lib/engine-types";

const imageQuality = (v: SettingsValues) =>
  (v.format === "jpeg" || v.format === "webp" || v.format === "avif") &&
  !v.lossless;
const imageLossless = (v: SettingsValues) =>
  v.format === "webp" || v.format === "avif";
const imageProgressive = (v: SettingsValues) =>
  v.format === "jpeg" || v.format === "png";

export const imagesSection = defineCustomSection({
  title: "Images",
  description: "Resize, format, and encoding for saved images.",
  groups: [
    group.with(useImageDownloadBinding, {
      title: "Format",
      items: [
        {
          control: "select",
          key: "maxLongEdge",
          title: "Resolution",
          description: "Resize anything larger than this.",
          options: [
            { value: 1024, label: "1024\u00A0px" },
            { value: 2048, label: "2048\u00A0px" },
            { value: 4096, label: "4096\u00A0px" },
            { value: 8192, label: "8192\u00A0px" },
            { value: null, label: "Original" },
          ],
        },
        {
          control: "select",
          key: "format",
          title: "Format",
          description: "Keep the format or convert future downloads.",
          options: [
            { value: "original", label: "Same Format" },
            { value: "jpeg", label: "JPEG" },
            { value: "png", label: "PNG" },
            { value: "webp", label: "WebP" },
            { value: "avif", label: "AVIF" },
          ],
        },
      ],
    }),
    group.with(useImageDownloadBinding, {
      title: "Advanced encoding",
      items: [
        {
          control: "select",
          key: "quality",
          title: "Quality",
          description: "Higher keeps more detail.",
          visible: imageQuality,
          options: [
            { value: 50, label: "50%" },
            { value: 60, label: "60%" },
            { value: 70, label: "70%" },
            { value: 80, label: "80%" },
            { value: 90, label: "90%" },
            { value: 95, label: "95%" },
            { value: 100, label: "100%" },
          ],
        },
        {
          control: "switch",
          key: "lossless",
          title: "Lossless",
          description: "Encode WebP/AVIF without quality loss.",
          visible: imageLossless,
        },
        {
          control: "switch",
          key: "progressive",
          title: "Progressive",
          description: "Load JPEG and PNG in passes.",
          visible: imageProgressive,
        },
        {
          control: "switch",
          key: "preserveMetadata",
          title: "Preserve Metadata",
          description: "Keep camera, location, and color details.",
        },
      ],
    }),
  ],
});
