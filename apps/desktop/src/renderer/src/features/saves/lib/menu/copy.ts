import {
  IconBinaryOutline18,
  IconClone2Outline18,
  IconCopyOutline18,
  IconGlobeOutline18,
  IconImageOutline18,
  IconLink2Outline18,
  IconPathOutline18,
  IconTagsOutline18,
  IconTextOutline18,
} from "@pond/icons/outline/18";
import type { MenuItemSpec } from "@pond/ui";
import { isThumbnailKind } from "@shared/save-file-names";
import {
  copyBase64,
  copyFilePath,
  copyName,
  copyPrimaryMedia,
  copyTags,
  copyThumbnail,
  copyUrl,
} from "@/features/saves/lib/actions";
import {
  copyFilePathsForSelection,
  copyFilesForSelection,
  copyNamesForSelection,
  copyTagsForSelection,
  copyUrlsForSelection,
} from "@/features/saves/lib/selection";
import { shortcutGlyphs } from "@/shared/lib/shortcuts";
import { notify } from "@/shared/lib/toast";
import { glyph, notifyCopy, submenuHidden } from "./shared";
import type { SaveMenuContext } from "./types";

export function buildCopyItems({
  save,
  ids,
  batch,
  copyLabel,
  hasFiles,
  fileIndex,
  hasUrl,
  hasTags,
}: SaveMenuContext): MenuItemSpec[] {
  const more: MenuItemSpec[] = [
    {
      label: "Copy Thumbnail",
      icon: glyph(IconImageOutline18),
      hidden: batch || !save.files.some((file) => isThumbnailKind(file.kind)),
      onClick: () => void copyThumbnail(save),
    },
    {
      label: "Copy as Base64",
      icon: glyph(IconBinaryOutline18),
      hidden: batch || !hasFiles,
      onClick: () => void copyBase64(save, fileIndex),
    },
    {
      label: "Copy Pond Link",
      icon: glyph(IconLink2Outline18),
      onClick: () => {
        void window.pond
          .query("saves.copyInternalLinks", { ids })
          .then(() =>
            notify({
              id: "copy-pond-link",
              title: ids.length > 1 ? "Pond links copied" : "Pond link copied",
            }),
          )
          .catch(() =>
            notify({ id: "copy-pond-link", title: "Couldn't copy Pond link" }),
          );
      },
    },
    {
      label: "Copy URL",
      icon: glyph(IconGlobeOutline18),
      hidden: !hasUrl,
      shortcut: shortcutGlyphs("save.copy-url"),
      onClick: () => {
        if (batch) {
          void copyUrlsForSelection(ids).then(notifyCopy);
          return;
        }
        if (save.url) void copyUrl(save.url);
      },
    },
  ];

  return [
    {
      label: "Copy Name",
      icon: glyph(IconTextOutline18),
      onClick: () => {
        if (batch) void copyNamesForSelection(ids).then(notifyCopy);
        else void copyName(save);
      },
    },
    {
      id: "copy-primary",
      label: copyLabel,
      icon: glyph(IconClone2Outline18),
      hidden: !hasFiles,
      shortcut: shortcutGlyphs("save.copy-image"),
      onClick: () => {
        if (batch) void copyFilesForSelection(ids);
        else void copyPrimaryMedia(save, fileIndex);
      },
    },
    {
      label: "Copy File Path",
      icon: glyph(IconPathOutline18),
      hidden: !hasFiles,
      onClick: () => {
        if (batch) {
          void copyFilePathsForSelection(ids).then(notifyCopy);
          return;
        }
        void copyFilePath(save, fileIndex);
      },
    },
    {
      type: "submenu",
      label: "Copy Options",
      icon: glyph(IconCopyOutline18),
      hidden: submenuHidden(more),
      items: more,
    },
    {
      label: "Copy Tags",
      icon: glyph(IconTagsOutline18),
      hidden: !hasTags,
      shortcut: shortcutGlyphs("save.copy-tags"),
      onClick: () => {
        if (batch) copyTagsForSelection(ids);
        else copyTags(save);
      },
    },
  ];
}
