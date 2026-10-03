import {
  IconArchiveExportOutline18,
  IconBoxArchiveOutline18,
  IconConversionOutline18,
  IconFileExportOutline18,
  IconFileZipOutline18,
  IconGaugeOutline18,
  IconImageBinaryOutline18,
  IconImageMinusOutline18,
  IconImageOutline18,
  IconImageSparkleOutline18,
  IconImageUpscaleOutline18,
  IconPhotoOutline18,
  IconShieldCheckOutline18,
  IconTableDownloadOutline18,
} from "@pond/icons/outline/18";
import { Dialog, type MenuItemSpec } from "@pond/ui";
import { saveLibraryBridge } from "@/features/saves/lib/library-bridge";
import {
  exportSelectionCsv,
  exportSelectionFiles,
} from "@/features/saves/lib/selection";
import { shortcutGlyphs } from "@/shared/lib/shortcuts";
import { notify } from "@/shared/lib/toast";
import { glyph } from "./shared";
import type { SaveMenuContext } from "./types";

function compressibleImageCount(context: SaveMenuContext): number {
  return context.saves.filter((save) =>
    save.files.some((file) =>
      /\.(gif|jpe?g|jfif|png|svg|webp)$/i.test(file.path),
    ),
  ).length;
}

function startWebpConvert(
  ids: string[],
  fileIndex: number,
  format: "png" | "jpeg",
) {
  return window.pond.query("conversion.start", {
    ids,
    fileIndex,
    preset: {
      id: `webp-${format}`,
      name: format === "png" ? "PNG" : "JPG",
      format,
      width: null,
      height: null,
      quality: format === "png" ? 100 : 90,
      lossless: false,
      start: 0,
      duration: 5,
      fps: 12,
    },
  });
}

function compressImages(
  ids: string[],
  fileIndex: number,
  mode: "lossless" | "quality" | "webp" | "upscale" | "remove-background",
): void {
  const editing = mode === "upscale" || mode === "remove-background";
  const title =
    mode === "webp"
      ? "Convert to WebP"
      : mode === "upscale"
        ? "Upscale Images"
        : mode === "remove-background"
          ? "Remove Backgrounds"
          : "Compress Images";
  Dialog.confirm({
    title,
    description:
      mode === "webp"
        ? "This replaces selected image files with WebP files and regenerates their thumbnails and metadata. You can undo the completed batch."
        : editing
          ? "Pond records this replacement in Undo history. Applying replaces selected files and regenerates their thumbnails and metadata."
          : "This replaces the selected image files and regenerates their thumbnails and metadata. You can undo the completed batch.",
    confirmLabel: mode === "webp" ? "Convert" : editing ? "Apply" : "Compress",
    onConfirm: async () => {
      const job = await window.pond.query("conversion.compress", {
        ids,
        fileIndex,
        mode,
        quality: 85,
      });
      notify({
        id: `image-compression-${job.id}`,
        title: "Compressing Images",
      });
      void pollCompression(job.id);
    },
  });
}

async function pollCompression(id: string): Promise<void> {
  const job = await window.pond.query("conversion.status", { id });
  if (!job) return;
  if (job.status === "running") {
    setTimeout(() => void pollCompression(id), 500);
    return;
  }
  notify({
    id: `image-compression-${id}`,
    title:
      job.status === "complete"
        ? `Compressed ${job.changed} ${job.changed === 1 ? "image" : "images"}${job.skipped > 0 ? `. Skipped ${job.skipped}.` : ""}`
        : job.status === "cancelled"
          ? "Image Compression Cancelled"
          : job.error || "Couldn’t compress these images.",
  });
}

export function buildExportItems(context: SaveMenuContext): MenuItemSpec[] {
  const { ids, hasFiles, fileIndex, isWebp } = context;
  return [
    {
      id: "export-files",
      label: "Export Files",
      icon: glyph(IconFileExportOutline18),
      keywords: "files",
      hidden: !hasFiles,
      shortcut: shortcutGlyphs("save.export"),
      onClick: () => {
        void exportSelectionFiles(ids);
      },
    },
    {
      id: "export-converted",
      label: "Export Converted Files",
      icon: glyph(IconConversionOutline18),
      hidden: !hasFiles,
      onClick: () => saveLibraryBridge.openConversion(ids, fileIndex ?? 0),
    },
    {
      type: "submenu",
      label: "Compress Images",
      icon: glyph(IconFileZipOutline18),
      hidden: compressibleImageCount(context) === 0,
      items: [
        {
          label: "Convert to WebP",
          icon: glyph(IconImageOutline18),
          onClick: () => compressImages(ids, fileIndex ?? 0, "webp"),
        },
        {
          label: "Lossless",
          icon: glyph(IconShieldCheckOutline18),
          onClick: () => compressImages(ids, fileIndex ?? 0, "lossless"),
        },
        {
          label: "Quality 85",
          icon: glyph(IconGaugeOutline18),
          onClick: () => compressImages(ids, fileIndex ?? 0, "quality"),
        },
      ],
    },
    {
      type: "submenu",
      label: "Image Tools",
      icon: glyph(IconImageSparkleOutline18),
      hidden: compressibleImageCount(context) === 0,
      items: [
        {
          label: "Remove Background",
          icon: glyph(IconImageMinusOutline18),
          onClick: () =>
            compressImages(ids, fileIndex ?? 0, "remove-background"),
        },
        {
          label: "Upscale 2×",
          icon: glyph(IconImageUpscaleOutline18),
          onClick: () => compressImages(ids, fileIndex ?? 0, "upscale"),
        },
      ],
    },
    {
      label: "Export as WebP",
      icon: glyph(IconImageOutline18),
      hidden: !hasFiles,
      onClick: () => {
        void window.pond.query("saves.exportWebp", { ids });
      },
    },
    {
      label: "Convert to PNG",
      icon: glyph(IconImageBinaryOutline18),
      hidden: !isWebp,
      onClick: () => {
        void startWebpConvert(ids, fileIndex ?? 0, "png");
      },
    },
    {
      label: "Convert to JPG",
      icon: glyph(IconPhotoOutline18),
      hidden: !isWebp,
      onClick: () => {
        void startWebpConvert(ids, fileIndex ?? 0, "jpeg");
      },
    },
    {
      id: "export-eagle-package",
      label: "Export Eagle Package",
      icon: glyph(IconBoxArchiveOutline18),
      keywords: "eagle package",
      onClick: () => {
        void window.pond
          .query("saves.exportEaglePackage", { ids })
          .then((result) => {
            if (!result.ok && result.error !== "canceled")
              notify({
                id: "eagle-package-export",
                title: result.error || "Couldn't export Eagle package.",
              });
            else if (result.ok)
              notify({
                id: "eagle-package-export",
                title: "Eagle package exported",
              });
          });
      },
    },
    {
      label: "Export Pond Package",
      icon: glyph(IconArchiveExportOutline18),
      keywords: "package",
      onClick: () => {
        void window.pond
          .query("saves.exportPackage", { ids })
          .then((result) => {
            if (!result.ok && result.error !== "canceled")
              notify({
                id: "package-export",
                title: result.error || "Couldn't export package.",
              });
            else if (result.ok)
              notify({ id: "package-export", title: "Pond package exported" });
          });
      },
    },
    {
      id: "export-csv",
      label: "Export to CSV",
      icon: glyph(IconTableDownloadOutline18),
      keywords: "csv",
      onClick: () => void exportSelectionCsv(ids),
    },
  ];
}

const EXPORT_POPUP_IDS = new Set([
  "export-files",
  "export-converted",
  "export-eagle-package",
  "export-csv",
]);

export function buildExportPopupItems(
  context: SaveMenuContext,
): MenuItemSpec[] {
  return buildExportItems(context).filter(
    (item) =>
      item.type !== "separator" &&
      "id" in item &&
      item.id !== undefined &&
      EXPORT_POPUP_IDS.has(item.id) &&
      !item.hidden,
  );
}
