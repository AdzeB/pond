import { IconDotsFill18 as Ellipsis } from "@pond/icons/fill/18";
import {
  IconClone2Outline18 as Copy,
  IconTrash2Outline18 as DeleteForever,
  IconFileOutline18 as File,
  IconFolderOutline18 as FilePath,
  IconGlobeOutline18 as Globe,
  IconImageOutline18 as Image,
  IconBracketsCurlyOutline18 as Json,
  IconLink2Outline18 as Link,
  IconWindowShareOutline18 as OpenExternal,
  IconFileRefreshOutline18 as Refresh,
  IconArrowRotateAnticlockwiseOutline18 as Restore,
  IconFolderOpenOutline18 as Reveal,
  IconScanImageOutline18 as ScanImage,
  IconMagnifierOutline18 as Search,
  IconTrash2Outline18 as Trash,
  IconVectorOutline18 as Vector,
  IconWandSparkleOutline18 as Wand,
} from "@pond/icons/outline/18";
import { Menu, type MenuItemSpec } from "@pond/ui";
import { useRouter } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";
import type { useSave } from "@/hooks/use-saves";
import {
  autoTag,
  rebuildVisualIndex,
  reembed,
  type TaskResult,
} from "@/lib/enrichment/tasks";
import {
  copyFile,
  copyFilePath,
  copyImage,
  copyUrl,
  openDefaultApp,
  openInBrowser,
  purgeForever,
  refreshSaveMetadata,
  revealFile,
  trashSave,
  untrashSave,
} from "@/lib/save/actions";
import {
  REVERSE_SEARCH_ENGINES,
  reverseImageSearch,
} from "@/lib/save/reverse-image-search";
import { REVEAL_LABEL } from "@/lib/ui/platform";
import { useTagClipboard } from "@/stores/tag-clipboard";
import { pushToast } from "@/stores/toasts";

export function KebabMenu({
  save,
}: {
  save: ReturnType<typeof useSave> | null;
}) {
  const router = useRouter();
  const _clipboardEmpty = useTagClipboard().length === 0;

  const hasUrl = !!save?.url;
  const hasFiles = (save?.files ?? []).length > 0;
  const _hasTags = (save?.tags ?? []).length > 0;
  const hasRawJson = !!save?.rawJson;
  const isTrashed = !!save?.deletedAt;

  const onTrash = useCallback(async () => {
    if (!save) return;
    await trashSave(save);
    router.history.back();
  }, [save, router]);

  const onRestore = useCallback(async () => {
    if (!save) return;
    await untrashSave(save);
  }, [save]);

  const onPurge = useCallback(async () => {
    if (!save) return;
    await purgeForever(save);
    router.history.back();
  }, [save, router]);

  const reprocess = useCallback(
    (run: (ids?: readonly string[]) => TaskResult) => {
      if (!save) return;
      const res = run([save.id]);
      pushToast(res.message, res.ok ? "info" : "error");
    },
    [save],
  );

  const _onAutoTag = useCallback(async () => {
    if (!save) return;
    const res = await autoTag([save.id]);
    pushToast(res.message, res.ok ? "success" : "error");
  }, [save]);

  const copyRawJson = useCallback(async () => {
    if (!save?.rawJson) return;
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(save.rawJson, null, 2),
      );
      pushToast("Copied raw JSON", "success");
    } catch {
      pushToast("Could not copy", "error");
    }
  }, [save]);

  const items = useMemo<MenuItemSpec[]>(
    () => [
      {
        type: "submenu",
        label: "Open",
        icon: <OpenExternal />,
        disabled: !hasFiles && !hasUrl,
        items: [
          {
            label: "Default App",
            icon: <OpenExternal />,
            shortcut: "O",
            disabled: !hasFiles,
            onClick: () => save && void openDefaultApp(save),
          },
          {
            label: "Original Source",
            icon: <Globe />,
            disabled: !hasUrl,
            onClick: () => save && void openInBrowser(save),
          },
          {
            label: REVEAL_LABEL,
            icon: <Reveal />,
            disabled: !hasFiles,
            onClick: () => save && void revealFile(save),
          },
        ],
      },

      {
        type: "submenu",
        label: "Copy",
        icon: <Copy />,
        disabled: !hasUrl && !hasFiles && !hasRawJson,
        items: [
          {
            label: "File",
            icon: <File />,
            shortcut: "⌘C",
            disabled: !hasFiles,
            onClick: () => save && void copyFile(save),
          },
          {
            label: "Image",
            icon: <Image />,
            disabled: !hasFiles,
            onClick: () => save && void copyImage(save),
          },
          {
            label: "Link",
            icon: <Link />,
            shortcut: "C",
            disabled: !hasUrl,
            onClick: () => save?.url && void copyUrl(save.url),
          },
          {
            label: "File Path",
            icon: <FilePath />,
            disabled: !hasFiles,
            onClick: () => save && void copyFilePath(save),
          },
          { type: "separator" },
          {
            label: "Raw JSON",
            icon: <Json />,
            disabled: !hasRawJson,
            onClick: () => void copyRawJson(),
          },
        ],
      },
      { type: "separator" },
      {
        type: "submenu",
        label: "Search",
        icon: <Search />,
        disabled: !hasFiles && !hasUrl,
        items: REVERSE_SEARCH_ENGINES.map((engine) => ({
          label: engine.label,
          onClick: () => save && void reverseImageSearch(save, engine.key),
        })),
      },
      {
        type: "submenu",
        label: "Enhance",
        icon: <Wand />,
        disabled: !save,
        items: [
          {
            label: "Metadata",
            icon: <Refresh />,
            shortcut: "R",
            disabled: !hasUrl,
            onClick: () => save && void refreshSaveMetadata(save),
          },
          { type: "separator" },
          {
            label: "Semantic Index",
            icon: <Vector />,
            onClick: () => reprocess(reembed),
          },
          {
            label: "Visual Index",
            icon: <ScanImage />,
            onClick: () => reprocess(rebuildVisualIndex),
          },
        ],
      },
      { type: "separator" },
      ...(isTrashed
        ? ([
            {
              label: "Restore from Trash",
              icon: <Restore />,
              shortcut: "⌫",
              disabled: !save,
              onClick: onRestore,
            },
            {
              label: "Delete Forever",
              icon: <DeleteForever />,
              shortcut: "⌘⌫",
              disabled: !save,
              onClick: onPurge,
            },
          ] satisfies MenuItemSpec[])
        : ([
            {
              label: "Delete",
              icon: <Trash />,
              shortcut: "⌫",
              disabled: !save,
              onClick: onTrash,
            },
          ] satisfies MenuItemSpec[])),
    ],
    [
      save,
      hasUrl,
      hasFiles,
      hasRawJson,
      isTrashed,
      onTrash,
      onRestore,
      onPurge,
      reprocess,
      copyRawJson,
    ],
  );

  return (
    <Menu.Root>
      <Menu.Trigger variant="ghost" size="sm" icon>
        <Ellipsis />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="start" sideOffset={6}>
          <Menu.Popup>
            <Menu.Items items={items} />
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
