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
  rebuildVisualIndex,
  reembed,
  TASK_ENABLED,
} from "@/lib/enrichment/tasks";
import {
  copyableImageIndex,
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
import { shortcutGlyphs } from "@/lib/save/shortcuts";
import { REVEAL_LABEL } from "@/lib/ui/platform";
import { usePrefsValue } from "@/stores/prefs";

export function KebabMenu({
  save,
}: {
  save: ReturnType<typeof useSave> | null;
}) {
  const router = useRouter();
  const prefs = usePrefsValue();

  const hasUrl = !!save?.url;
  const hasFiles = (save?.files ?? []).length > 0;
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

  /** Silent, matching the system convention that Cmd+C confirms nothing. */
  const copyRawJson = useCallback(async () => {
    if (!save?.rawJson) return;
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(save.rawJson, null, 2),
      );
    } catch {
      /** Clipboard can reject without focus; nothing to confirm. */
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
            shortcut: shortcutGlyphs("save.open"),
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
            disabled: !hasFiles,
            onClick: () => save && void copyFile(save),
          },
          {
            label: "Image",
            icon: <Image />,
            shortcut: shortcutGlyphs("save.copy-image"),
            disabled: !save || copyableImageIndex(save) == null,
            onClick: () => save && void copyImage(save),
          },
          {
            label: "Link",
            icon: <Link />,
            shortcut: shortcutGlyphs("save.copy-url"),
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
        /** Reverse search needs a public image URL from the capture metadata; local-only saves have none. */
        disabled: !hasUrl,
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
            shortcut: shortcutGlyphs("save.refresh"),
            disabled: !hasUrl,
            onClick: () => save && void refreshSaveMetadata(save),
          },
          { type: "separator" },
          {
            label: "Semantic Index",
            icon: <Vector />,
            disabled: !TASK_ENABLED.reembed(prefs),
            onClick: () => save && void reembed([save.id]),
          },
          {
            label: "Visual Index",
            icon: <ScanImage />,
            disabled: !TASK_ENABLED.clip(prefs),
            onClick: () => save && void rebuildVisualIndex([save.id]),
          },
        ],
      },
      { type: "separator" },
      ...(isTrashed
        ? ([
            {
              label: "Restore from Trash",
              icon: <Restore />,
              shortcut: shortcutGlyphs("save.restore"),
              disabled: !save,
              onClick: onRestore,
            },
            {
              label: "Delete Forever",
              icon: <DeleteForever />,
              shortcut: shortcutGlyphs("save.delete-forever"),
              disabled: !save,
              onClick: onPurge,
            },
          ] satisfies MenuItemSpec[])
        : ([
            {
              label: "Move to Trash",
              icon: <Trash />,
              shortcut: shortcutGlyphs("save.trash"),
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
      prefs,
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
