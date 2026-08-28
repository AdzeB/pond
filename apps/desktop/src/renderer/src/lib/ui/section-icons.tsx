import {
  IconArchiveContent2Fill18,
  IconDownloadFill18,
  IconGlobeFill18,
  IconTrash2ContentFill18,
} from "@pond/icons/fill/18";
import {
  IconDownloadOutline18,
  IconGlobeOutline18,
  IconTrash2Outline18,
} from "@pond/icons/outline/18";

export const SECTION_ICONS_FILL = {
  library: IconArchiveContent2Fill18,
  sources: IconGlobeFill18,
  trash: IconTrash2ContentFill18,
  downloads: IconDownloadFill18,
} as const;

export const SECTION_ICONS = {
  library: IconArchiveContent2Fill18,
  sources: IconGlobeOutline18,
  trash: IconTrash2Outline18,
  downloads: IconDownloadOutline18,
} as const;
