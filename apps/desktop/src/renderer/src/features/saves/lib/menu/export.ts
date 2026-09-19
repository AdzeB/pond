import {
  IconBoxArchiveOutline18,
  IconConversionOutline18,
  IconFileExportOutline18,
  IconImageOutline18,
  IconTableDownloadOutline18,
} from "@pond/icons/outline/18";
import type { MenuItemSpec } from "@pond/ui";
import { saveLibraryBridge } from "@/features/saves/lib/library-bridge";
import {
  exportSelectionCsv,
  exportSelectionFiles,
} from "@/features/saves/lib/selection";
import { shortcutGlyphs } from "@/shared/lib/shortcuts";
import { notify } from "@/shared/lib/toast";
import { glyph } from "./shared";
import type { SaveMenuContext } from "./types";

function startWebpConvert(ids: string[], format: "png" | "jpeg") {
  return window.pond.query("conversion.start", {
    ids,
    fileIndex: 0,
    preset: {
      id: `webp-${format}`,
      name: format === "png" ? "PNG" : "JPG",
      format,
      width: null,
      height: null,
      quality: format === "png" ? 100 : 90,
      start: 0,
      duration: 5,
      fps: 12,
    },
  });
}

export function buildExportItems({
  ids,
  hasFiles,
  fileIndex,
  isWebp,
}: SaveMenuContext): MenuItemSpec[] {
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
        void startWebpConvert(ids, "png");
      },
    },
    {
      label: "Convert to JPG",
      hidden: !isWebp,
      onClick: () => {
        void startWebpConvert(ids, "jpeg");
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
