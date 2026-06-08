import type { SectionConfig } from "../engine";
import { useImageDownloadBinding } from "./downloads";

type Values = Record<string, unknown>;

const imageReencode = (v: Values) => v.format !== "original";
const imageQuality = (v: Values) =>
  (v.format === "jpeg" || v.format === "webp" || v.format === "avif") &&
  !v.lossless;
const imageLossless = (v: Values) => v.format === "webp" || v.format === "avif";
const imageProgressive = (v: Values) =>
  v.format === "jpeg" || v.format === "png";

export const imagesSection: SectionConfig = {
  title: "Images",
  description: "Resize, format, and encoding for saved images.",
  groups: [
    {
      title: "Format",
      useBinding: useImageDownloadBinding,
      items: [
        {
          control: "select",
          key: "maxLongEdge",
          title: "Resolution",
          description: "Long edge in pixels. Pond resizes anything larger.",
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
          description: "Convert saved images, or keep the original encoding.",
          options: [
            { value: "original", label: "Original" },
            { value: "jpeg", label: "JPEG" },
            { value: "png", label: "PNG" },
            { value: "webp", label: "WebP" },
            { value: "avif", label: "AVIF" },
          ],
        },
      ],
    },
    {
      title: "Image Encoding",
      useBinding: useImageDownloadBinding,
      items: [
        {
          control: "select",
          key: "quality",
          title: "Quality",
          description: "Higher keeps more detail at the cost of size.",
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
          description: "Render JPEG/PNG in passes as they load.",
          visible: imageProgressive,
        },
        {
          control: "switch",
          key: "preserveMetadata",
          title: "Preserve Metadata",
          description: "Keep EXIF and color profile when re-encoding.",
          visible: imageReencode,
        },
      ],
    },
  ],
};
