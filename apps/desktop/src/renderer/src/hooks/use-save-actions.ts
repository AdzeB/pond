import {
  IconClipboardArrowOutOutline18 as ClipboardPaste,
  IconCopyOutline18 as Copy,
  IconDownloadOutline18 as Download,
  IconOpenExternalOutline18 as ExternalLink,
  IconFinderOutline18 as FolderOpen,
  IconGlobe2Outline18 as Globe,
  IconImageOutline18 as ImageIcon,
  IconLinkOutline18 as LinkIcon,
  IconArrowDoorOutOutline18 as LogOut,
  IconMediaPlayOutline18 as Play,
  IconRefreshClockwiseOutline18 as RefreshCw,
  IconMagnifierOutline18 as Search,
  IconTagsOutline18 as Tags,
  IconTrash2Outline18 as Trash2,
} from "@pond/icons/outline/18";
import { useMemo } from "react";
import { purgeSave, trashSave, untrashSave } from "@/lib/mutate-save";
import { REVEAL_LABEL } from "@/lib/platform";
import {
  REVERSE_SEARCH_ENGINES,
  reverseImageSearch,
} from "@/lib/reverse-image-search";
import {
  copyFilePath,
  copyImage as copyImageAction,
  copyTags as copyTagsAction,
  enterPresentation,
  exportFile as exportFileAction,
  openDefaultApp,
  openInBrowser,
  pasteTags as pasteTagsAction,
  revealFile,
} from "@/lib/save-actions";
import type { Save } from "@/lib/types";
import { useTagClipboard } from "@/stores/tag-clipboard";

interface ItemDescriptor {
  type: "item";
  key: string;
  label: string;
  icon: React.ComponentType<{ width: number; height: number }>;
  disabled?: boolean;
  variant?: "danger";
  shortcut?: string[];
  onSelect: () => void | Promise<void>;
}

interface SubmenuDescriptor {
  type: "submenu";
  key: string;
  label: string;
  icon: React.ComponentType<{ width: number; height: number }>;
  disabled?: boolean;
  items: ActionDescriptor[];
}

interface SeparatorDescriptor {
  type: "separator";
  key: string;
}

export type ActionDescriptor =
  | ItemDescriptor
  | SubmenuDescriptor
  | SeparatorDescriptor;

export function useSaveActions(save: Save): ActionDescriptor[] {
  const clipboard = useTagClipboard();
  const clipboardEmpty = clipboard.length === 0;
  const hasFiles = save.files.length > 0;
  const hasTags = save.tags.length > 0;
  const isTrashed = Boolean(save.deletedAt);
  const hasUrl = Boolean(save.url);

  return useMemo<ActionDescriptor[]>(() => {
    const copyUrl = async () => {
      if (!save.url) return;
      try {
        await navigator.clipboard.writeText(save.url);
      } catch {
        /* clipboard unavailable, drop silently */
      }
    };

    const trash = async () => {
      await trashSave(save.id);
    };

    const untrash = async () => {
      await untrashSave(save.id);
    };

    const purge = async () => {
      await purgeSave(save.id);
    };

    const refresh = async () => {
      if (!save.url) return;
      await window.pond.refreshSave(save.id);
    };

    const reverseSearchItems: ActionDescriptor[] = REVERSE_SEARCH_ENGINES.map(
      (engine) => ({
        type: "item",
        key: `reverse-${engine.key}`,
        label: engine.label,
        icon: Search,
        onSelect: () => reverseImageSearch(save, engine.key),
      }),
    );

    const items: ActionDescriptor[] = [
      {
        type: "item",
        key: "open",
        label: "Open with Default App",
        icon: ExternalLink,
        disabled: !hasFiles,
        shortcut: ["O"],
        onSelect: () => openDefaultApp(save),
      },
      {
        type: "item",
        key: "reveal",
        label: REVEAL_LABEL,
        icon: FolderOpen,
        disabled: !hasFiles,
        onSelect: () => revealFile(save),
      },
      { type: "separator", key: "sep-1" },
      {
        type: "item",
        key: "copy-url",
        label: "Copy URL",
        icon: LinkIcon,
        disabled: !hasUrl,
        shortcut: ["C"],
        onSelect: copyUrl,
      },
      {
        type: "item",
        key: "copy-image",
        label: "Copy Image",
        icon: ImageIcon,
        disabled: !hasFiles,
        shortcut: ["⌘", "C"],
        onSelect: () => copyImageAction(save),
      },
      {
        type: "item",
        key: "copy-path",
        label: "Copy File Path",
        icon: Copy,
        disabled: !hasFiles,
        onSelect: () => copyFilePath(save),
      },
      {
        type: "item",
        key: "copy-tags",
        label: "Copy Tags",
        icon: Tags,
        disabled: !hasTags,
        shortcut: ["⌘", "⇧", "C"],
        onSelect: () => copyTagsAction(save),
      },
      {
        type: "item",
        key: "paste-tags",
        label: "Paste Tags",
        icon: ClipboardPaste,
        disabled: clipboardEmpty,
        shortcut: ["⌘", "⇧", "V"],
        onSelect: () => pasteTagsAction(save),
      },
      { type: "separator", key: "sep-2" },
      {
        type: "submenu",
        key: "reverse-search",
        label: "Reverse Image Search",
        icon: Search,
        disabled: !hasFiles && !hasUrl,
        items: reverseSearchItems,
      },
      {
        type: "item",
        key: "export",
        label: "Export…",
        icon: Download,
        disabled: !hasFiles,
        shortcut: ["⌘", "E"],
        onSelect: () => exportFileAction(save),
      },
      {
        type: "item",
        key: "presentation",
        label: "Enter Presentation Mode",
        icon: Play,
        disabled: !hasFiles,
        shortcut: ["F5"],
        onSelect: () => enterPresentation(save),
      },
      { type: "separator", key: "sep-3" },
      ...(isTrashed
        ? ([
            {
              type: "item",
              key: "untrash",
              label: "Restore from Trash",
              icon: LogOut,
              shortcut: ["⌫"],
              onSelect: untrash,
            },
            {
              type: "item",
              key: "purge",
              label: "Delete Forever",
              icon: Trash2,
              variant: "danger",
              shortcut: ["⌘", "⌫"],
              onSelect: purge,
            },
          ] satisfies ActionDescriptor[])
        : ([
            {
              type: "item",
              key: "trash",
              label: "Move to Trash",
              icon: Trash2,
              variant: "danger",
              shortcut: ["⌫"],
              onSelect: trash,
            },
          ] satisfies ActionDescriptor[])),
      { type: "separator", key: "sep-4" },
      {
        type: "item",
        key: "refresh",
        label: "Refresh details",
        icon: RefreshCw,
        disabled: !hasUrl,
        shortcut: ["R"],
        onSelect: refresh,
      },
      {
        type: "item",
        key: "open-browser",
        label: "Open Original URL in Browser",
        icon: Globe,
        disabled: !hasUrl,
        onSelect: () => openInBrowser(save),
      },
    ];

    return items;
  }, [save, hasFiles, hasUrl, hasTags, isTrashed, clipboardEmpty]);
}
