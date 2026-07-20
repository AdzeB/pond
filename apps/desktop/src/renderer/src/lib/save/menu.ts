import type { MenuItemSpec } from "@pond/ui";
import {
  copyableImageIndex,
  copyFile as copyFileAction,
  copyFilePath,
  copyImage as copyImageAction,
  copyTags as copyTagsAction,
  copyUrl,
  exportFile as exportFileAction,
  openDefaultApp,
  openInBrowser,
  pasteTags as pasteTagsAction,
  revealFile,
} from "@/lib/save/actions";
import { purgeSave, trashSave, untrashSave } from "@/lib/save/mutate";
import {
  REVERSE_SEARCH_ENGINES,
  reverseImageSearch,
} from "@/lib/save/reverse-image-search";
import { shortcutGlyphs } from "@/lib/save/shortcuts";
import type { Save } from "@/lib/types";
import { REVEAL_LABEL } from "@/lib/ui/platform";
import { tumbleToTrash } from "@/stores/trash-tumble";

interface BuildSaveMenuOptions {
  /** Whether the tag clipboard is empty (controls the Paste Tags item). */
  clipboardEmpty: boolean;
}

/** Plain function rather than a hook so a card never subscribes to the tag clipboard just to host a menu; the list is assembled lazily on open. */
export function buildSaveMenu(
  save: Save,
  { clipboardEmpty }: BuildSaveMenuOptions,
): MenuItemSpec[] {
  const hasFiles = save.files.length > 0;
  const hasTags = save.tags.length > 0;
  const isTrashed = Boolean(save.deletedAt);
  const hasUrl = Boolean(save.url);
  /** Videos and other non-image saves never get a Copy Image item; the viewer offers Copy Current Frame instead. */
  const hasImage = copyableImageIndex(save) != null;

  const reverseSearchItems: MenuItemSpec[] = REVERSE_SEARCH_ENGINES.map(
    (engine) => ({
      label: engine.label,
      onClick: () => void reverseImageSearch(save, engine.key),
    }),
  );

  const restoreItems: MenuItemSpec[] = isTrashed
    ? [
        {
          label: "Restore from Trash",
          shortcut: shortcutGlyphs("save.restore"),
          onClick: () => void untrashSave(save.id),
        },
        {
          label: "Delete Forever",
          shortcut: shortcutGlyphs("save.delete-forever"),
          onClick: () => void purgeSave(save.id),
        },
      ]
    : [
        {
          label: "Move to Trash",
          shortcut: shortcutGlyphs("save.trash"),
          onClick: () =>
            void tumbleToTrash([save.id]).then(() => trashSave(save.id)),
        },
      ];

  return [
    {
      label: "Open with Default App",
      disabled: !hasFiles,
      shortcut: shortcutGlyphs("save.open"),
      onClick: () => void openDefaultApp(save),
    },
    {
      label: REVEAL_LABEL,
      disabled: !hasFiles,
      onClick: () => void revealFile(save),
    },
    { type: "separator" },
    {
      label: "Copy URL",
      disabled: !hasUrl,
      shortcut: shortcutGlyphs("save.copy-url"),
      onClick: () => {
        if (save.url) void copyUrl(save.url);
      },
    },
    ...(hasImage
      ? [
          {
            label: "Copy Image",
            shortcut: shortcutGlyphs("save.copy-image"),
            onClick: () => void copyImageAction(save),
          } satisfies MenuItemSpec,
        ]
      : []),
    {
      label: "Copy File",
      disabled: !hasFiles,
      onClick: () => void copyFileAction(save),
    },
    {
      label: "Copy File Path",
      disabled: !hasFiles,
      onClick: () => void copyFilePath(save),
    },
    {
      label: "Copy Tags",
      disabled: !hasTags,
      shortcut: shortcutGlyphs("save.copy-tags"),
      onClick: () => copyTagsAction(save),
    },
    {
      label: "Paste Tags",
      disabled: clipboardEmpty,
      shortcut: shortcutGlyphs("save.paste-tags"),
      onClick: () => void pasteTagsAction(save),
    },
    { type: "separator" },
    {
      type: "submenu",
      label: "Reverse Image Search",
      /** Reverse search needs a public image URL from the capture metadata; local-only saves have none. */
      disabled: !hasUrl,
      items: reverseSearchItems,
    },
    {
      label: "Export",
      disabled: !hasFiles,
      shortcut: shortcutGlyphs("save.export"),
      onClick: () => void exportFileAction(save),
    },
    { type: "separator" },
    ...restoreItems,
    { type: "separator" },
    {
      label: "Refresh Details",
      disabled: !hasUrl,
      shortcut: shortcutGlyphs("save.refresh"),
      onClick: () => {
        if (save.url) void window.pond.refreshSave(save.id);
      },
    },
    {
      label: "Archive Full Site",
      disabled: !(hasUrl && save.source === "web" && !isTrashed),
      onClick: () => void window.pond.archiveSite(save.id),
    },
    save.url
      ? {
          type: "link",
          label: "Open Original URL in Browser",
          href: save.url,
          onClick: () => void openInBrowser(save),
        }
      : {
          label: "Open Original URL in Browser",
          disabled: true,
        },
  ];
}
