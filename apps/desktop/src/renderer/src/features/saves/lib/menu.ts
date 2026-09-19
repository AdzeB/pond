import {
  IconApplicationsOutline18,
  IconArchiveExportOutline18,
  IconClone2Outline18,
  IconDotsOutline18,
  IconFoldersOutline18,
  IconMagnifierOutline18,
  IconMediaPlayOutline18,
} from "@pond/icons/outline/18";
import type { MenuItemSpec } from "@pond/ui";
import type { Save } from "@/features/saves/types";
import { buildAdvancedItems, buildReverseSearchItems } from "./menu/advanced";
import { buildAgentItems } from "./menu/agent";
import { createSaveMenuContext } from "./menu/context";
import { buildCopyItems } from "./menu/copy";
import { buildExportItems } from "./menu/export";
import { buildOpenItems } from "./menu/open";
import { buildOrganizeItems } from "./menu/organize";
import { buildShareItem } from "./menu/share";
import { glyph, submenuHidden } from "./menu/shared";
import { buildTrashItems } from "./menu/trash";
import type { BuildSaveMenuOptions } from "./menu/types";

export {
  loadOpenWithApps,
  type OpenWithApp,
  openWithKind,
  peekOpenWithApps,
} from "@/features/saves/lib/open-with-menu";
export { contextMenuSaves } from "./menu/context";

export function buildSaveMenu(
  saveOrSaves: Save | readonly Save[],
  options: BuildSaveMenuOptions,
): MenuItemSpec[] {
  const context = createSaveMenuContext(saveOrSaves, options);
  if (!context) return [];

  const openItems = buildOpenItems(context);
  const organizeItems = buildOrganizeItems(context);
  const copyItems = buildCopyItems(context);
  const exportItems = buildExportItems(context);
  const reverseSearchItems = buildReverseSearchItems(context);
  const { agent: agentItems, maintenance: maintenanceItems } =
    buildAgentItems(context);
  const advancedItems = buildAdvancedItems(context, maintenanceItems);

  return [
    {
      type: "submenu",
      id: `open:${
        context.openWithApps.some((app) => app.icon) ? "icons" : "names"
      }`,
      label: "Open",
      icon: glyph(IconApplicationsOutline18),
      hidden: submenuHidden(openItems),
      items: openItems,
    },
    {
      type: "submenu",
      label: "Organise",
      icon: glyph(IconFoldersOutline18),
      hidden: submenuHidden(organizeItems),
      items: organizeItems,
    },
    {
      type: "submenu",
      label: "Copy",
      icon: glyph(IconClone2Outline18),
      hidden: submenuHidden(copyItems),
      items: copyItems,
    },
    buildShareItem(context),
    {
      type: "submenu",
      label: "Export",
      icon: glyph(IconArchiveExportOutline18),
      hidden: submenuHidden(exportItems),
      items: exportItems,
    },
    {
      type: "submenu",
      label: "Search by Image",
      icon: glyph(IconMagnifierOutline18),
      hidden: !context.hasHttpUrl || submenuHidden(reverseSearchItems),
      items: reverseSearchItems,
    },
    {
      type: "submenu",
      label: "Agent",
      icon: glyph(IconMediaPlayOutline18),
      hidden: context.allTrashed || submenuHidden(agentItems),
      items: agentItems,
    },
    {
      type: "submenu",
      label: "Advanced",
      icon: glyph(IconDotsOutline18),
      hidden: submenuHidden(advancedItems),
      items: advancedItems,
    },
    { type: "separator" },
    ...buildTrashItems(context),
  ];
}
