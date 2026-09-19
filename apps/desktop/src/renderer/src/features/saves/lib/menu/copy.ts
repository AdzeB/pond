import {
  IconClone2Outline18,
  IconFileOutline18,
  IconGlobeOutline18,
  IconLink2Outline18,
  IconTagsOutline18,
} from "@pond/icons/outline/18";
import type { MenuItemSpec } from "@pond/ui";
import {
  copyFilePath,
  copyPrimaryMedia,
  copyTags,
  copyUrl,
} from "@/features/saves/lib/actions";
import {
  copyFilePathsForSelection,
  copyFilesForSelection,
  copyTagsForSelection,
  copyUrlsForSelection,
} from "@/features/saves/lib/selection";
import { shortcutGlyphs } from "@/shared/lib/shortcuts";
import { notify } from "@/shared/lib/toast";
import { glyph, notifyCopy } from "./shared";
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
  return [
    {
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
      icon: glyph(IconFileOutline18),
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
            notify({ id: "copy-pond-link", title: "Couldn’t copy Pond link" }),
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
