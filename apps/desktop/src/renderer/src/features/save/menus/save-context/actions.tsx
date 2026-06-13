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
import { useToast } from "@pond/ui";
import { useMemo } from "react";
import { purgeSave, trashSave, untrashSave } from "@/core/data/mutate-save";
import type { Save } from "@/core/data/types";
import { REVEAL_LABEL } from "@/core/lib/platform";
import {
  copyImage as copyImageAction,
  copyTags as copyTagsAction,
  enterPresentation,
  exportFile as exportFileAction,
  pasteTags as pasteTagsAction,
} from "@/features/save/save-actions";
import { useTagClipboard } from "@/features/tags/stores/tag-clipboard";

type Toast = ReturnType<typeof useToast>;

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

// Reverse image search engines, each mapping a public image URL to a search URL (local saves gated upstream).
const REVERSE_SEARCH_ENGINES: ReadonlyArray<{
  key: string;
  label: string;
  url: (encoded: string) => string;
}> = [
  {
    key: "google-lens",
    label: "Google Lens",
    url: (u) => `https://lens.google.com/uploadbyurl?url=${u}`,
  },
  {
    key: "yandex",
    label: "Yandex",
    url: (u) => `https://yandex.com/images/search?rpt=imageview&url=${u}`,
  },
  {
    key: "bing",
    label: "Bing",
    url: (u) =>
      `https://www.bing.com/images/search?view=detailv2&iss=sbi&form=SBIVSP&q=imgurl:${u}`,
  },
  {
    key: "tineye",
    label: "TinEye",
    url: (u) => `https://www.tineye.com/search?url=${u}`,
  },
];

async function reverseImageSearch(
  save: Save,
  engineKey: string,
  toast: Toast,
): Promise<void> {
  const engine = REVERSE_SEARCH_ENGINES.find((e) => e.key === engineKey);
  if (!engine) return;
  const result = (await window.pond.query("saves.publicImageUrl", {
    id: save.id,
  })) as { ok: true; url: string | null } | { ok: false; url: null };
  if (!result.ok || !result.url) {
    toast.add({
      title: "No public image URL for this save",
      type: "error",
    });
    return;
  }
  const encoded = encodeURIComponent(result.url);
  await window.pond.openExternal(engine.url(encoded));
}

export function useSaveActions(save: Save): ActionDescriptor[] {
  const toast = useToast();
  const clipboard = useTagClipboard();
  const clipboardEmpty = clipboard.length === 0;
  const hasFiles = save.files.length > 0;
  const hasTags = save.tags.length > 0;
  const isTrashed = Boolean(save.deletedAt);
  const hasUrl = Boolean(save.url);
  const fileIndex = save.coverIndex ?? 0;

  return useMemo<ActionDescriptor[]>(() => {
    const openFile = async () => {
      if (!hasFiles) return;
      await window.pond.openSaveFile(save.id, fileIndex);
    };

    const revealFile = async () => {
      if (!hasFiles) return;
      await window.pond.revealSave(save.id, fileIndex);
    };

    const copyUrl = async () => {
      if (!save.url) return;
      try {
        await navigator.clipboard.writeText(save.url);
        toast.add({ title: "URL copied", type: "success" });
      } catch {
        toast.add({ title: "Couldn't copy URL", type: "error" });
      }
    };

    const copyFilePath = async () => {
      const result = (await window.pond.query("saves.filePath", {
        id: save.id,
        fileIndex,
      })) as { ok: true; path: string } | { ok: false; reason: string };
      if (!result.ok) {
        toast.add({ title: "File not available", type: "error" });
        return;
      }
      try {
        await navigator.clipboard.writeText(result.path);
        toast.add({ title: "File path copied", type: "success" });
      } catch {
        toast.add({ title: "Couldn't copy file path", type: "error" });
      }
    };

    const trash = async () => {
      await trashSave(save.id);
      toast.add({ title: "Moved to trash", type: "success" });
    };

    const untrash = async () => {
      await untrashSave(save.id);
      toast.add({ title: "Restored", type: "success" });
    };

    const purge = async () => {
      await purgeSave(save.id);
      toast.add({ title: "Deleted forever", type: "success" });
    };

    const refresh = async () => {
      if (!save.url) return;
      await window.pond.refreshSave(save.id);
    };

    const openInBrowser = async () => {
      if (!save.url) return;
      try {
        const parsed = new URL(save.url);
        if (parsed.protocol === "http:" || parsed.protocol === "https:") {
          await window.pond.openExternal(parsed.toString());
        }
      } catch {
        /* malformed URL, drop silently */
      }
    };

    const reverseSearchItems: ActionDescriptor[] = REVERSE_SEARCH_ENGINES.map(
      (engine) => ({
        type: "item",
        key: `reverse-${engine.key}`,
        label: engine.label,
        icon: Search,
        onSelect: () => reverseImageSearch(save, engine.key, toast),
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
        onSelect: openFile,
      },
      {
        type: "item",
        key: "reveal",
        label: REVEAL_LABEL,
        icon: FolderOpen,
        disabled: !hasFiles,
        onSelect: revealFile,
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
        onSelect: () => copyImageAction(save, toast),
      },
      {
        type: "item",
        key: "copy-path",
        label: "Copy File Path",
        icon: Copy,
        disabled: !hasFiles,
        onSelect: copyFilePath,
      },
      {
        type: "item",
        key: "copy-tags",
        label: "Copy Tags",
        icon: Tags,
        disabled: !hasTags,
        shortcut: ["⌘", "⇧", "C"],
        onSelect: () => copyTagsAction(save, toast),
      },
      {
        type: "item",
        key: "paste-tags",
        label: "Paste Tags",
        icon: ClipboardPaste,
        disabled: clipboardEmpty,
        shortcut: ["⌘", "⇧", "V"],
        onSelect: () => pasteTagsAction(save, toast),
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
        onSelect: () => exportFileAction(save, toast),
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
        label: "Refresh Metadata",
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
        onSelect: openInBrowser,
      },
    ];

    return items;
  }, [
    save,
    toast,
    hasFiles,
    hasUrl,
    hasTags,
    isTrashed,
    clipboardEmpty,
    fileIndex,
  ]);
}
