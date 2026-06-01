import { ContextMenu, Kbd, Menu, useToast } from "@pond/ui";
import {
  ClipboardPaste,
  Copy,
  Download,
  ExternalLink,
  FolderOpen,
  Globe,
  Image as ImageIcon,
  Link as LinkIcon,
  LogOut,
  Maximize2,
  Play,
  RefreshCw,
  Search,
  Tags,
  Trash2,
} from "lucide-react";
import { type ReactElement, type ReactNode, useMemo } from "react";
import { REVEAL_LABEL } from "@/lib/platform";
import {
  copyImage as copyImageAction,
  copyTags as copyTagsAction,
  enterPresentation,
  exportFile as exportFileAction,
  openInNewWindow as openInNewWindowAction,
  pasteTags as pasteTagsAction,
} from "@/lib/save-actions";
import { useTagClipboard } from "@/lib/tag-clipboard";
import { purgeSave, trashSave, untrashSave } from "@/pool/mutate-save";
import type { Save } from "@/pool/types";

const ICON_SIZE = 14;

type Toast = ReturnType<typeof useToast>;

function Icon({
  component: Component,
}: {
  component: React.ComponentType<{ width: number; height: number }>;
}) {
  return <Component width={ICON_SIZE} height={ICON_SIZE} />;
}

interface ItemDescriptor {
  type: "item";
  key: string;
  label: string;
  icon: React.ComponentType<{ width: number; height: number }>;
  disabled?: boolean;
  variant?: "danger";
  // Mirrors the keys in `effects/save-shortcuts.tsx`.
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

type ActionDescriptor =
  | ItemDescriptor
  | SubmenuDescriptor
  | SeparatorDescriptor;

// Reverse image search engines. Each takes a public image URL and
// returns a search URL the engine can fetch server-side. Local-only
// saves are gated upstream because engines can't reach `pond://` URLs.
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

function useSaveActions(save: Save): ActionDescriptor[] {
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
        key: "open-window",
        label: "Open in New Window",
        icon: Maximize2,
        shortcut: ["⌘", "O"],
        onSelect: () => openInNewWindowAction(save),
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

function renderContextAction(action: ActionDescriptor): ReactNode {
  if (action.type === "separator") {
    return <ContextMenu.Separator key={action.key} />;
  }
  if (action.type === "submenu") {
    return (
      <ContextMenu.SubmenuRoot key={action.key}>
        <ContextMenu.SubmenuTrigger disabled={action.disabled}>
          <ContextMenu.ItemIcon>
            <Icon component={action.icon} />
          </ContextMenu.ItemIcon>
          <ContextMenu.ItemLabel>{action.label}</ContextMenu.ItemLabel>
        </ContextMenu.SubmenuTrigger>
        <ContextMenu.Portal>
          <ContextMenu.Positioner>
            <ContextMenu.Popup>
              {action.items.map(renderContextAction)}
            </ContextMenu.Popup>
          </ContextMenu.Positioner>
        </ContextMenu.Portal>
      </ContextMenu.SubmenuRoot>
    );
  }
  return (
    <ContextMenu.Item
      key={action.key}
      disabled={action.disabled}
      data-variant={action.variant}
      onClick={() => void action.onSelect()}
    >
      <ContextMenu.ItemIcon>
        <Icon component={action.icon} />
      </ContextMenu.ItemIcon>
      <ContextMenu.ItemLabel>{action.label}</ContextMenu.ItemLabel>
      {action.shortcut ? (
        <ContextMenu.ItemKbd>
          <Kbd.Cluster keys={action.shortcut} />
        </ContextMenu.ItemKbd>
      ) : null}
    </ContextMenu.Item>
  );
}

function renderMenuAction(action: ActionDescriptor): ReactNode {
  if (action.type === "separator") {
    return <Menu.Separator key={action.key} />;
  }
  if (action.type === "submenu") {
    return (
      <Menu.SubmenuRoot key={action.key}>
        <Menu.SubmenuTrigger disabled={action.disabled}>
          <Menu.ItemIcon>
            <Icon component={action.icon} />
          </Menu.ItemIcon>
          <Menu.ItemLabel>{action.label}</Menu.ItemLabel>
        </Menu.SubmenuTrigger>
        <Menu.Portal>
          <Menu.Positioner>
            <Menu.Popup>{action.items.map(renderMenuAction)}</Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.SubmenuRoot>
    );
  }
  return (
    <Menu.Item
      key={action.key}
      disabled={action.disabled}
      data-variant={action.variant}
      onClick={() => void action.onSelect()}
    >
      <Menu.ItemIcon>
        <Icon component={action.icon} />
      </Menu.ItemIcon>
      <Menu.ItemLabel>{action.label}</Menu.ItemLabel>
      {action.shortcut ? (
        <Menu.ItemKbd>
          <Kbd.Cluster keys={action.shortcut} />
        </Menu.ItemKbd>
      ) : null}
    </Menu.Item>
  );
}

interface SaveContextMenuProps {
  save: Save;
  children: ReactElement;
}

export function SaveContextMenu({ save, children }: SaveContextMenuProps) {
  const actions = useSaveActions(save);

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger render={children} />
      <ContextMenu.Portal>
        <ContextMenu.Backdrop />
        <ContextMenu.Positioner>
          <ContextMenu.Popup>
            {actions.map(renderContextAction)}
          </ContextMenu.Popup>
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

interface SaveActionsMenuProps {
  save: Save;
  children: ReactElement;
}

export function SaveActionsMenu({ save, children }: SaveActionsMenuProps) {
  const actions = useSaveActions(save);

  return (
    <Menu.Root>
      <Menu.Trigger render={children} />
      <Menu.Portal>
        <Menu.Positioner align="end" side="bottom" sideOffset={4}>
          <Menu.Popup>{actions.map(renderMenuAction)}</Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
