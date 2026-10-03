import type { RecentMenuEntry } from "../../shared/constants";
import { buildEditSection } from "./edit-section";
import { buildFileSection } from "./file-section";
import { buildFindSection } from "./find-section";
import { buildLibrarySection } from "./library-section";
import { buildGoSection, buildHistorySection } from "./navigation-sections";
import { buildOrganizeSection } from "./organize-section";
import {
  buildApplicationSections,
  buildDeveloperSections,
  buildHelpSection,
  buildSettingsItem,
  buildWindowSection,
} from "./system-sections";
import type { AppMenuContext, AppMenuItem } from "./types";
import { buildViewSection } from "./view-section";

export function buildAppMenuTemplate(
  context: AppMenuContext,
  recentEntries: RecentMenuEntry[],
): AppMenuItem[] {
  const settingsItem = buildSettingsItem(context);

  return localizeMenuItems(
    [
      ...buildApplicationSections(context, settingsItem),
      buildFileSection(context),
      buildEditSection(context, settingsItem),
      buildFindSection(context),
      buildOrganizeSection(context),
      buildViewSection(context),
      buildGoSection(context),
      buildHistorySection(context, recentEntries),
      buildLibrarySection(context),
      buildWindowSection(context),
      ...buildDeveloperSections(context),
      buildHelpSection(context),
    ],
    context.translateCopy,
  );
}

function localizeMenuItems(
  items: AppMenuItem[],
  translateCopy: (copy: string) => string,
): AppMenuItem[] {
  for (const item of items) {
    if (item.label) item.label = translateCopy(item.label);
    if (Array.isArray(item.submenu)) {
      localizeMenuItems(item.submenu, translateCopy);
    }
  }
  return items;
}
