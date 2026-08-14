import {
  IconArchiveContent2Fill18,
  IconGlobeFill18,
  IconTrash2ContentFill18,
} from "@pond/icons/fill/18";
import {
  IconGlobeOutline18,
  IconTrash2Outline18,
} from "@pond/icons/outline/18";

/** Dock nav uses fill; tab chrome uses outline twins where they exist. */
export const SECTION_ICONS_FILL = {
  library: IconArchiveContent2Fill18,
  sources: IconGlobeFill18,
  trash: IconTrash2ContentFill18,
} as const;

/** Outline twins of the dock glyphs. Library has no archive outline, so it keeps the fill. */
export const SECTION_ICONS = {
  library: IconArchiveContent2Fill18,
  sources: IconGlobeOutline18,
  trash: IconTrash2Outline18,
} as const;
