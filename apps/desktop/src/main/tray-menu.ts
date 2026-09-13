import { saves } from "@pond/schema/db";
import { count, desc, eq, isNull } from "drizzle-orm";
import { app, Menu, type MenuItemConstructorOptions } from "electron";
import { syncAllSources } from "./core/sync";
import { getDb } from "./db";
import { FILE_MENU_CREATE_LABELS } from "./file-menu";
import { rotateIngestToken } from "./keychain";
import { libraryRoot } from "./paths";
import type { TrayOptions } from "./tray";

const RECENTS_LIMIT = 6;

export async function buildTooltip(): Promise<string> {
  try {
    const db = await getDb();
    const [row] = await db
      .select({ n: count() })
      .from(saves)
      .where(isNull(saves.deletedAt));
    const libraryName =
      libraryRoot()
        .split("/")
        .pop()
        ?.replace(/\.(pond|library)$/, "") ?? "Library";
    return `${libraryName} · ${row?.n ?? 0} saves`;
  } catch {
    return "Pond";
  }
}

export async function buildMenu(
  opts: TrayOptions,
  refresh: () => void,
): Promise<{ menu: Menu; ingesting: number }> {
  const db = await getDb().catch(() => null);

  const [activeRow] = db
    ? await db.select({ n: count() }).from(saves).where(isNull(saves.deletedAt))
    : [];
  const active = Number(activeRow?.n ?? 0);

  const [ingestRow] = db
    ? await db
        .select({ n: count() })
        .from(saves)
        .where(eq(saves.status, "ingesting"))
    : [];
  const ingesting = Number(ingestRow?.n ?? 0);

  const recents = db
    ? await db
        .select({
          id: saves.id,
          title: saves.title,
          author: saves.author,
          url: saves.url,
        })
        .from(saves)
        .where(isNull(saves.deletedAt))
        .orderBy(desc(saves.savedAt))
        .limit(RECENTS_LIMIT)
    : [];

  const libraryName =
    libraryRoot()
      .split("/")
      .pop()
      ?.replace(/\.(pond|library)$/, "") ?? "Library";
  const loginItem = app.getLoginItemSettings();

  const headerLabel =
    ingesting > 0
      ? `Saving ${ingesting} item${ingesting === 1 ? "" : "s"}`
      : `${libraryName} · ${active} saves`;

  const recentItems: MenuItemConstructorOptions[] = recents.map((r) => ({
    label: recentLabel(r),
    click: () => void opts.onOpenSave?.(r.id),
  }));

  const template: MenuItemConstructorOptions[] = [
    { label: headerLabel, enabled: false },
    { type: "separator" },
  ];

  if (recentItems.length > 0) {
    template.push({ label: "Recently Saved", enabled: false }, ...recentItems, {
      type: "separator",
    });
  }

  template.push(
    {
      label: FILE_MENU_CREATE_LABELS[2],
      click: () => void opts.onMenuAction?.("library.new-note"),
    },
    {
      label: FILE_MENU_CREATE_LABELS[3],
      click: () => void opts.onMenuAction?.("library.import-files"),
    },
    {
      label: "Collection Window",
      click: () => void opts.onOpenCollection?.(),
    },
    { type: "separator" },
    {
      label: "Open Library",
      accelerator: "CommandOrControl+Shift+P",
      click: () => void opts.onOpenLibrary(),
    },
    { type: "separator" },
    {
      label: "Settings",
      click: () => void (opts.onOpenSettings ?? opts.onOpenLibrary)(),
    },
    {
      label: "Sync Now",
      click: () => {
        void syncAllSources({ trigger: "manual" });
      },
    },
    { type: "separator" },
    {
      label: "Rotate Ingest Token",
      click: async () => {
        await rotateIngestToken();
        refresh();
      },
    },
    { type: "separator" },
    {
      label: "Launch on Startup",
      type: "checkbox",
      checked: loginItem.openAtLogin,
      click: (menuItem) => {
        if (!app.isPackaged) return;
        app.setLoginItemSettings({
          openAtLogin: menuItem.checked,
          openAsHidden: true,
        });
      },
    },
    { type: "separator" },
    { label: `Pond ${app.getVersion()}`, enabled: false },
    {
      label: "Quit",
      accelerator: "CommandOrControl+Q",
      role: "quit",
    },
  );

  return { menu: Menu.buildFromTemplate(template), ingesting };
}

function recentLabel(r: {
  title: string | null;
  author: string | null;
  url: string;
}): string {
  const title = r.title?.replace(/\s+/g, " ").trim();
  if (title) return truncate(title);
  const author = r.author?.replace(/\s+/g, " ").trim();
  if (author) return truncate(author);
  const host = hostFromUrl(r.url);
  if (host) return truncate(host);
  return "Untitled";
}

function truncate(value: string): string {
  return value.length > 44 ? `${value.slice(0, 43)}…` : value;
}

function hostFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
