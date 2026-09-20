import {
  IconBoxArchiveOutline18,
  IconConversionOutline18,
  IconFileExportOutline18,
  IconImageOutline18,
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
  mode: "lossless" | "quality",
): void {
  Dialog.confirm({
    title: "Compress Images",
    description:
      "This replaces the selected image files and regenerates their thumbnails and metadata. You can undo the completed batch.",
    confirmLabel: "Compress",
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
      label: "Export Converted Files",
      icon: glyph(IconConversionOutline18),
      hidden: !hasFiles,
      onClick: () => saveLibraryBridge.openConversion(ids, fileIndex ?? 0),
    },
    {
      type: "submenu",
      label: "Compress Images",
      icon: glyph(IconConversionOutline18),
      hidden: compressibleImageCount(context) === 0,
      items: [
        {
          label: "Lossless",
          onClick: () => compressImages(ids, fileIndex ?? 0, "lossless"),
        },
        {
          label: "Quality 85",
          onClick: () => compressImages(ids, fileIndex ?? 0, "quality"),
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
      hidden: !isWebp,
      onClick: () => {
        void startWebpConvert(ids, fileIndex ?? 0, "png");
      },
    },
    {
      label: "Convert to JPG",
      hidden: !isWebp,
      onClick: () => {
        void startWebpConvert(ids, fileIndex ?? 0, "jpeg");
      },
    },
    {
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
      icon: glyph(IconBoxArchiveOutline18),
      keywords: "package",
      onClick: () => {
        void window.pond
          .query("saves.exportPackage", { ids })
          .then((result) => {
            if (!result.ok && result.error === "password_required") {
              Dialog.prompt({
                title: "Protect Pond Package",
                description:
                  "Enter a password for this export. Pond will show a separate recovery key after export.",
                inputType: "password",
                autoComplete: "new-password",
                confirmLabel: "Export",
                onConfirm: async (password) => {
                  if (password.length < 8)
                    throw new Error("Use at least 8 characters.");
                  const protectedResult = await window.pond.query(
                    "saves.exportPackage",
                    { ids, password },
                  );
                  if (!protectedResult.ok)
                    throw new Error(
                      protectedResult.error || "Couldn't export package.",
                    );
                  if (protectedResult.recoveryKey) {
                    Dialog.confirm({
                      title: "Package Recovery Key",
                      description: protectedResult.recoveryKey,
                      confirmLabel: "Copy Recovery Key",
                      cancelLabel: "Done",
                      onConfirm: async () => {
                        await window.pond.query("clipboard.writeText", {
                          text: protectedResult.recoveryKey ?? "",
                        });
                      },
                    });
                  }
                },
              });
              return;
            }
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
      label: "Export to CSV",
      icon: glyph(IconTableDownloadOutline18),
      keywords: "csv",
      onClick: () => void exportSelectionCsv(ids),
    },
  ];
}
