import {
  IconCopyIdOutline18,
  IconFileOutline18,
  IconImageOutline18,
} from "@pond/icons/outline/18";
import { Dialog, type MenuItemSpec } from "@pond/ui";
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
import { openCombineImagesDialog } from "@/features/saves/state/combine-images-dialog";
import type { Save } from "@/features/saves/types";
import { shortcutGlyphs } from "@/shared/lib/shortcuts";
import { notify } from "@/shared/lib/toast";
import { buildDetailItems } from "./details";
import { glyph, notifyCopy } from "./shared";
import type { SaveMenuContext } from "./types";

function reverseSearchLogo(
  key: (typeof REVERSE_SEARCH_ENGINES)[number]["key"],
): string | null {
  switch (key) {
    case "google-lens":
      return googleLensLogo;
    case "yandex":
      return yandexLogo;
    case "bing":
      return bingLogo;
    case "tineye":
      return tineyeLogo;
    case "saucenao":
      return sauceNaoLogo;
    case "baidu":
    case "sogou":
      return null;
  }
}

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
  hasHttpUrl,
}: SaveMenuContext): MenuItemSpec[] {
  return [
    {
      label: "Find Similar Saves",
      icon: glyph(IconImageOutline18),
      hidden: batch || save.mediaType !== "image",
      onClick: () =>
        saveLibraryBridge.setVisualProbe({
          id: save.id,
          label: save.title?.trim() || "Selected Save",
        }),
    },
    ...REVERSE_SEARCH_ENGINES.map((engine): MenuItemSpec => {
      const logo = reverseSearchLogo(engine.key);
      return {
        label: engine.label,
        icon: logo
          ? createElement("img", {
              src: logo,
              alt: "",
              width: 16,
              height: 16,
              draggable: false,
            })
          : glyph(IconImageOutline18),
        hidden:
          "usesImageUrl" in engine && !engine.usesImageUrl
            ? false
            : !hasHttpUrl,
        keywords: engine.key === "saucenao" ? "sauce nao anime" : undefined,
        onClick: () => {
          if (batch) {
            void reverseImageSearchForSelection(ids, engine.key);
            return;
          }
          void reverseImageSearch(save, engine.key);
        },
      };
    }),
  ];
}

export interface SupplementalMenuItems {
  copy: MenuItemSpec[];
  details: ReturnType<typeof buildDetailItems>;
  file: MenuItemSpec[];
  more: MenuItemSpec[];
  organization: MenuItemSpec[];
}

export function buildSupplementalItems(
  context: SaveMenuContext,
  maintenanceItems: MenuItemSpec[],
): SupplementalMenuItems {
  const { save, saves, ids, batch, fontActivated } = context;
  const details = buildDetailItems(context);

  return {
    copy: [
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
    ],
    details,
    organization: [
      {
        label: "Combine Images",
        icon: glyph(IconImageOutline18),
        hidden: combinableImageCount(saves) < 2,
        onClick: () => {
          const nav = saveLibraryBridge.getNav();
          openCombineImagesDialog(ids, nav.kind === "folder" ? nav.id : null);
        },
      },
      ...details.organization,
    ],
    file: [
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
      ...details.file,
    ],
    more: [
      ...maintenanceItems,
      { type: "separator" },
      {
        label: "Change Extension",
        icon: glyph(IconFileOutline18),
        hidden: !saves.some((item) => item.files.length > 0),
        onClick: () => {
          Dialog.prompt({
            title: "Change Extension",
            confirmLabel: "Change Extension",
            placeholder: "png",
            onConfirm: async (extension) => {
              const result = await window.pond.query(
                "saves.batchEditExtension",
                { ids, extension },
              );
              notify({
                id: "batch-extension",
                title: "Extensions changed",
                description: `${result.changedFiles} files changed. Use Undo to reverse this action.`,
              });
            },
          });
        },
      },
    ],
  };
}
