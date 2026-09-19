import {
  IconCopyIdOutline18,
  IconFileOutline18,
  IconImageOutline18,
} from "@pond/icons/outline/18";
import type { MenuItemSpec } from "@pond/ui";
import { createElement } from "react";
import bingLogo from "@/assets/logos/reverse-search/bing.png";
import googleLensLogo from "@/assets/logos/reverse-search/google-lens.svg";
import sauceNaoLogo from "@/assets/logos/reverse-search/saucenao.png";
import tineyeLogo from "@/assets/logos/reverse-search/tineye.png";
import yandexLogo from "@/assets/logos/reverse-search/yandex.png";
import { copyId } from "@/features/saves/lib/actions";
import { saveLibraryBridge } from "@/features/saves/lib/library-bridge";
import {
  REVERSE_SEARCH_ENGINES,
  reverseImageSearch,
} from "@/features/saves/lib/reverse-image-search";
import {
  copyIdsForSelection,
  reverseImageSearchForSelection,
} from "@/features/saves/lib/selection";
import type { Save } from "@/features/saves/types";
import { shortcutGlyphs } from "@/shared/lib/shortcuts";
import { notify } from "@/shared/lib/toast";
import { buildDetailItems } from "./details";
import { glyph, notifyCopy } from "./shared";
import type { SaveMenuContext } from "./types";

const REVERSE_SEARCH_LOGOS = {
  "google-lens": googleLensLogo,
  yandex: yandexLogo,
  bing: bingLogo,
  tineye: tineyeLogo,
  saucenao: sauceNaoLogo,
} satisfies Record<(typeof REVERSE_SEARCH_ENGINES)[number]["key"], string>;

function combinableImageCount(items: readonly Save[]): number {
  return items.filter((item) =>
    item.files.some(
      (file) =>
        file.mimeType === "image/png" ||
        file.mimeType === "image/jpeg" ||
        file.mimeType === "image/jpg" ||
        /\.(png|jpe?g)$/i.test(file.path),
    ),
  ).length;
}

export function buildReverseSearchItems({
  save,
  ids,
  batch,
}: SaveMenuContext): MenuItemSpec[] {
  return REVERSE_SEARCH_ENGINES.map((engine) => ({
    label: engine.label,
    icon: createElement("img", {
      src: REVERSE_SEARCH_LOGOS[engine.key],
      alt: "",
      width: 16,
      height: 16,
      draggable: false,
    }),
    keywords: engine.key === "saucenao" ? "sauce nao anime" : undefined,
    onClick: () => {
      if (batch) {
        void reverseImageSearchForSelection(ids, engine.key);
        return;
      }
      void reverseImageSearch(save, engine.key);
    },
  }));
}

export function buildAdvancedItems(
  context: SaveMenuContext,
  maintenanceItems: MenuItemSpec[],
): MenuItemSpec[] {
  const { save, saves, ids, batch, fontActivated } = context;

  return [
    {
      label: "Copy Save ID",
      icon: glyph(IconCopyIdOutline18),
      shortcut: shortcutGlyphs("save.copy-id"),
      onClick: () => {
        if (batch) {
          void copyIdsForSelection(ids).then(notifyCopy);
          return;
        }
        void copyId(save.id);
      },
    },
    ...maintenanceItems,
    { type: "separator" },
    {
      label: "Combine Images",
      icon: glyph(IconImageOutline18),
      hidden: combinableImageCount(saves) < 2,
      onClick: () => {
        const nav = saveLibraryBridge.getNav();
        void window.pond
          .query("saves.combineImages", {
            ids,
            folderId: nav.kind === "folder" ? nav.id : null,
          })
          .then((result) => {
            if (!result.ok) {
              notify({
                id: "combine-images",
                title: result.error ?? "Couldn’t combine these images.",
              });
              return;
            }
            const skipped =
              result.skipped && result.skipped > 0
                ? ` Skipped ${result.skipped} that are not JPG or PNG.`
                : "";
            notify({
              id: "combine-images",
              title: `Combined ${ids.length} images.${skipped}`,
            });
          });
      },
    },
    {
      label: fontActivated ? "Deactivate Font" : "Activate Font",
      icon: glyph(IconFileOutline18),
      hidden: batch || save.mediaType !== "font",
      onClick: () => {
        void window.pond.query(
          fontActivated ? "saves.deactivateFont" : "saves.activateFont",
          { id: save.id },
        );
      },
    },
    ...buildDetailItems(context),
  ];
}
