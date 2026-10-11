import {
  isAuxiliaryKind,
  isThumbnailKind,
  THUMBNAIL_DARK_KIND,
  THUMBNAIL_KIND,
} from "@shared/save-file-names";
import { buildPondUrl } from "@/features/saves/lib/media/url";
import {
  type ViewerCapability,
  viewerCapabilityFor,
} from "@/features/saves/lib/media/viewer-capability";
import type { Save } from "@/features/saves/types";
import type { ResolvedTheme } from "@/shared/hooks/use-resolved-theme";

export interface ViewerItem {
  key: string;
  fileIndex: number;
  url: string;
  capability: ViewerCapability;
  posterUrl?: string;
}

interface ViewerItemOptions {
  theme?: ResolvedTheme;
}

export function buildViewerItems(
  save: Save,
  options: ViewerItemOptions = {},
): ViewerItem[] {
  const posters = save.files.filter((file) => file.kind === "poster");
  let videoIndex = 0;

  const originals = save.files.flatMap((file, fileIndex) => {
    if (isAuxiliaryKind(file.kind)) return [];

    const capability = viewerCapabilityFor(file);
    const item: ViewerItem = {
      key: `${fileIndex}:${file.path}`,
      fileIndex,
      url: buildPondUrl(save.id, file),
      capability,
    };

    if (capability.surface === "temporal") {
      const poster = posters[videoIndex] ?? posters[0];
      videoIndex += 1;
      if (poster) item.posterUrl = buildPondUrl(save.id, poster);
    }

    return [item];
  });

  if (originals.length > 0) return originals;

  const preferredThumbnailKind =
    options.theme === "dark" ? THUMBNAIL_DARK_KIND : THUMBNAIL_KIND;
  const presentable =
    save.files.find((file) => file.kind === preferredThumbnailKind) ??
    save.files.find((file) => isThumbnailKind(file.kind)) ??
    posters[0];
  if (!presentable) return [];

  const fileIndex = save.files.indexOf(presentable);
  return [
    {
      key: `${fileIndex}:${presentable.path}`,
      fileIndex,
      url: buildPondUrl(save.id, presentable),
      capability: viewerCapabilityFor(presentable),
    },
  ];
}
