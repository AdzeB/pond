import type { Locale } from "@pond/schema";
import { EXTERNAL_SOURCE_IDS, sourceLabel } from "@pond/schema/sources";
import type { BlankDocumentKind } from "../shared/blank-documents";
import type { MenuActionId } from "../shared/constants";
import { createCopyTranslator, createTranslator } from "../shared/localization";
import { isWatchableSource } from "./core/watch/types";
import {
  FILE_MENU_AUTO_IMPORT_LABELS,
  FILE_MENU_DUPLICATES_LABELS,
  FILE_MENU_IMPORT_LABELS,
  FILE_MENU_NEW_LABELS,
} from "./file-menu";

export interface TrayStatusInput {
  libraryName: string;
  active: number;
  ingesting: number;
  inflight: number;
}

interface TrayTemplateItem {
  label?: string;
  type?: "separator";
  enabled?: boolean;
  accelerator?: string;
  registerAccelerator?: boolean;
  role?: "quit";
  click?: () => void;
  submenu?: TrayTemplateItem[];
}

export interface TrayTemplateActions {
  onOpenDownloads?: () => void | Promise<void>;
  onOpenSettings: () => void | Promise<void>;
  onMenuAction: (id: MenuActionId) => void | Promise<void>;
}

export interface TrayAccelerators {
  newFolder?: string;
  newNote?: string;
  captureScreenshot?: string;
  newTag?: string;
  newTagGroup?: string;
  importFiles?: string;
  importFolders?: string;
  importLinks?: string;
  rescan?: string;
  search?: string;
  sources?: string;
  downloads?: string;
  trash?: string;
  settings?: string;
}

export interface TrayBlankDocument {
  kind: BlankDocumentKind;
  label: string;
}

export function trayHeaderLabel(
  input: Pick<TrayStatusInput, "libraryName" | "active">,
  locale: Locale = "en",
): string {
  return createTranslator(locale)("tray.header", {
    libraryName: input.libraryName,
    count: input.active,
  });
}

export function traySavingLabel(
  input: Pick<TrayStatusInput, "ingesting" | "inflight">,
  locale: Locale = "en",
): string | null {
  const { ingesting, inflight } = input;
  const translate = createTranslator(locale);
  if (ingesting <= 0) return null;
  if (inflight <= 0) {
    return ingesting === 1
      ? translate("tray.waiting.one")
      : translate("tray.waiting.many", { count: ingesting });
  }
  if (inflight >= ingesting) {
    return ingesting === 1
      ? translate("tray.saving.one")
      : translate("tray.saving.many", { count: ingesting });
  }
  return translate("tray.saving.progress", {
    current: inflight,
    total: ingesting,
  });
}

export function trayBadge(input: Pick<TrayStatusInput, "inflight">): string {
  return input.inflight > 0 ? String(input.inflight) : "";
}

export function trayVersionLabel(version: string): string {
  return `Pond v${version}`;
}

export function buildTrayTemplate(
  status: TrayStatusInput,
  actions: TrayTemplateActions,
  options: {
    version: string;
    locale?: Locale;
    accelerators?: TrayAccelerators;
    blankDocuments?: readonly TrayBlankDocument[];
  },
): TrayTemplateItem[] {
  const accelerators = options.accelerators ?? {};
  const translate = createTranslator(options.locale ?? "en");
  const translateCopy = createCopyTranslator(options.locale ?? "en");
  const run = (
    label: string,
    id: MenuActionId,
    accelerator?: string,
  ): TrayTemplateItem => ({
    label,
    accelerator,
    registerAccelerator: false,
    click: () => void actions.onMenuAction(id),
  });

  const template: TrayTemplateItem[] = [
    {
      label: trayHeaderLabel(status, options.locale),
      enabled: false,
    },
  ];

  const saving = traySavingLabel(status, options.locale);
  if (saving) {
    template.push({
      label: saving,
      click: () => void actions.onOpenDownloads?.(),
    });
  }

  template.push(
    { type: "separator" },
    {
      label: "New",
      submenu: [
        run(
          FILE_MENU_NEW_LABELS[0],
          "library.new-folder",
          accelerators.newFolder,
        ),
        run(FILE_MENU_NEW_LABELS[1], "library.new-smart-folder"),
        run(FILE_MENU_NEW_LABELS[2], "library.new-smart-folder-group"),
        { type: "separator" },
        run(FILE_MENU_NEW_LABELS[4], "library.new-note", accelerators.newNote),
        ...(options.blankDocuments ?? []).map((doc) =>
          run(doc.label, `library.new-blank-${doc.kind}`),
        ),
        { type: "separator" },
        run("New Tag", "library.new-tag", accelerators.newTag),
        run("New Tag Group", "library.new-tag-group", accelerators.newTagGroup),
      ],
    },
    {
      label: "Capture",
      submenu: [
        run(
          "Capture Screenshot",
          "library.capture-screenshot",
          accelerators.captureScreenshot,
        ),
      ],
    },
    {
      label: "Import",
      submenu: [
        run(
          FILE_MENU_IMPORT_LABELS[0],
          "library.import-files",
          accelerators.importFiles,
        ),
        run(
          FILE_MENU_IMPORT_LABELS[1],
          "library.import-folders",
          accelerators.importFolders,
        ),
        run(
          FILE_MENU_IMPORT_LABELS[2],
          "library.import-links",
          accelerators.importLinks,
        ),
        run("Import from Clipboard", "library.import-clipboard"),
        { type: "separator" },
        run("Import Bookmarks", "library.import-bookmarks"),
        run("Import Page Assets", "library.import-page-assets"),
        { type: "separator" },
        run(FILE_MENU_IMPORT_LABELS[3], "library.import-eagle"),
        run(FILE_MENU_IMPORT_LABELS[4], "library.import-package"),
        { type: "separator" },
        {
          label: "Auto Import",
          submenu: [
            run(FILE_MENU_AUTO_IMPORT_LABELS[0], "library.auto-import-folder"),
          ],
        },
      ],
    },
    {
      label: "Sources",
      submenu: [
        {
          label: "New Source",
          submenu: EXTERNAL_SOURCE_IDS.map((source) =>
            run(sourceLabel(source), `library.connect-${source}`),
          ),
        },
        {
          label: "New Watch",
          submenu: EXTERNAL_SOURCE_IDS.filter(isWatchableSource).map((source) =>
            run(sourceLabel(source), `library.watch-${source}`),
          ),
        },
      ],
    },
    {
      label: "Library",
      submenu: [
        {
          label: "Find Duplicates",
          submenu: [
            run(FILE_MENU_DUPLICATES_LABELS[0], "library.find-duplicates-all"),
            run(FILE_MENU_DUPLICATES_LABELS[1], "library.find-duplicates-list"),
            run(
              FILE_MENU_DUPLICATES_LABELS[2],
              "library.find-duplicates-selected",
            ),
          ],
        },
        { type: "separator" },
        run("Rescan Library", "library.rescan", accelerators.rescan),
        run("Verify Integrity", "library.verify-integrity"),
      ],
    },
    {
      label: "Navigate",
      submenu: [
        run("Library", "nav.library"),
        run("Search", "library.search", accelerators.search),
        run("Sources", "nav.sources", accelerators.sources),
        run("Downloads", "nav.downloads", accelerators.downloads),
        run("Tags", "nav.tags"),
        run("Agent", "nav.agent"),
        { type: "separator" },
        run("Trash", "nav.trash", accelerators.trash),
        run("Uncategorized", "nav.uncategorized"),
        run("Untagged", "nav.untagged"),
        { type: "separator" },
        {
          label: translate("main.settings"),
          accelerator: accelerators.settings,
          registerAccelerator: false,
          click: () => void actions.onOpenSettings(),
        },
      ],
    },
    { type: "separator" },
    {
      label: translate("main.quit"),
      accelerator: "CommandOrControl+Q",
      role: "quit",
    },
    { type: "separator" },
    { label: trayVersionLabel(options.version), enabled: false },
  );

  return localizeTrayItems(template, translateCopy);
}

function localizeTrayItems(
  items: TrayTemplateItem[],
  translateCopy: (copy: string) => string,
): TrayTemplateItem[] {
  for (const item of items) {
    if (item.label) item.label = translateCopy(item.label);
    if (item.submenu) localizeTrayItems(item.submenu, translateCopy);
  }
  return items;
}
