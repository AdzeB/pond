import type { MenuItemSpec } from "@pond/ui";
import { buildNewMenuItems } from "@/features/library/components/new-menu/spec";
import { blankDocuments } from "@/features/library/state/blank-documents";

export function buildEmptyGalleryMenu(): MenuItemSpec[] {
  void blankDocuments.refresh();
  return buildNewMenuItems(blankDocuments.kinds(), blankDocuments.icons());
}
