import {
  copyFile as copyFileAction,
  copyFilePath,
  copyImage as copyImageAction,
  copyTags as copyTagsAction,
  exportFile as exportFileAction,
  openDefaultApp,
  openInBrowser,
  pasteTags as pasteTagsAction,
  revealFile,
} from "@/lib/save/actions";
import { purgeSave, trashSave, untrashSave } from "@/lib/save/mutate";
import { tumbleToTrash } from "@/stores/trash-tumble";
import {
  REVERSE_SEARCH_ENGINES,
  reverseImageSearch,
} from "@/lib/save/reverse-image-search";
import type { Save } from "@/lib/types";
import type { NativeMenuItem } from "@/lib/ui/native-menu";
import { REVEAL_LABEL } from "@/lib/ui/platform";

interface BuildSaveMenuOptions {
  /** Whether the tag clipboard is empty (controls the Paste Tags item). */
  clipboardEmpty: boolean;
}

/** Plain function rather than a hook so a card never subscribes to the tag clipboard just to host a menu; the list is assembled lazily on open. */
export function buildSaveMenu(
  save: Save,
  { clipboardEmpty }: BuildSaveMenuOptions,
): NativeMenuItem[] {
  const hasFiles = save.files.length > 0;
  const hasTags = save.tags.length > 0;
  const isTrashed = Boolean(save.deletedAt);
  const hasUrl = Boolean(save.url);

  const copyUrl = async () => {
    if (!save.url) return;
    try {
      await navigator.clipboard.writeText(save.url);
    } catch {
      /** Clipboard unavailable; drop silently. */
    }
  };

  const reverseSearchItems: NativeMenuItem[] = REVERSE_SEARCH_ENGINES.map(
    (engine) => ({
      label: engine.label,
      onSelect: () => reverseImageSearch(save, engine.key),
    }),
  );

  const restoreItems: NativeMenuItem[] = isTrashed
    ? [
        {
          label: "Restore from Trash",
          shortcut: ["⌫"],
          onSelect: () => untrashSave(save.id),
        },
        {
          label: "Delete Forever",
          shortcut: ["⌘", "⌫"],
          onSelect: () => purgeSave(save.id),
        },
      ]
    : [
        {
          label: "Move to Trash",
          shortcut: ["⌫"],
          onSelect: () =>
            void tumbleToTrash([save.id]).then(() => trashSave(save.id)),
        },
      ];

  return [
    {
      label: "Open with Default App",
      enabled: hasFiles,
      shortcut: ["O"],
      onSelect: () => openDefaultApp(save),
    },
    {
      label: REVEAL_LABEL,
      enabled: hasFiles,
      onSelect: () => revealFile(save),
    },
    { type: "separator" },
    {
      label: "Copy URL",
      enabled: hasUrl,
      shortcut: ["C"],
      onSelect: copyUrl,
    },
    {
      label: "Copy Image",
      enabled: hasFiles,
      shortcut: ["⌘", "C"],
      onSelect: () => copyImageAction(save),
    },
    {
      label: "Copy File",
      enabled: hasFiles,
      onSelect: () => copyFileAction(save),
    },
    {
      label: "Copy File Path",
      enabled: hasFiles,
      onSelect: () => copyFilePath(save),
    },
    {
      label: "Copy Tags",
      enabled: hasTags,
      shortcut: ["⌘", "⇧", "C"],
      onSelect: () => copyTagsAction(save),
    },
    {
      label: "Paste Tags",
      enabled: !clipboardEmpty,
      shortcut: ["⌘", "⇧", "V"],
      onSelect: () => pasteTagsAction(save),
    },
    { type: "separator" },
    {
      label: "Reverse Image Search",
      enabled: hasFiles || hasUrl,
      submenu: reverseSearchItems,
    },
    {
      label: "Export",
      enabled: hasFiles,
      shortcut: ["⌘", "E"],
      onSelect: () => exportFileAction(save),
    },
    { type: "separator" },
    ...restoreItems,
    { type: "separator" },
    {
      label: "Refresh details",
      enabled: hasUrl,
      shortcut: ["R"],
      onSelect: () => {
        if (save.url) void window.pond.refreshSave(save.id);
      },
    },
    {
      label: "Archive Full Site",
      enabled: hasUrl && save.source === "web" && !isTrashed,
      onSelect: () => void window.pond.archiveSite(save.id),
    },
    {
      label: "Open Original URL in Browser",
      enabled: hasUrl,
      onSelect: () => openInBrowser(save),
    },
  ];
}
