import { existsSync } from "node:fs";
import { type SaveFile, saves } from "@pond/schema/db";
import { count, desc, eq, isNull } from "drizzle-orm";
import {
  app,
  Menu,
  type MenuItemConstructorOptions,
  type NativeImage,
  nativeImage,
} from "electron";
import { DEFAULT_INGEST_PORT } from "../shared/constants";
import { syncAllSources } from "./core/sync";
import { getDb } from "./db";
import { getIngestToken, rotateIngestToken } from "./keychain";
import { itemFile, libraryRoot } from "./paths";
import type { TrayOptions } from "./tray";

// How many recent saves to surface in the menu.
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
          files: saves.files,
          coverIndex: saves.coverIndex,
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
      ? `Saving ${ingesting} item${ingesting === 1 ? "" : "s"}…`
      : `${libraryName} · ${active} saves`;

  const recentItems: MenuItemConstructorOptions[] = recents.map((r) => {
    const item: MenuItemConstructorOptions = {
      label: recentLabel(r),
      click: () => void opts.onOpenSave?.(r.id),
    };
    const icon = loadThumb(r.id, r.files, r.coverIndex);
    if (icon) item.icon = icon;
    return item;
  });

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
      label: "Open Library…",
      accelerator: "CommandOrControl+Shift+P",
      click: () => void opts.onOpenLibrary(),
    },
    {
      label: "Settings…",
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
      label: "Copy Pairing Token",
      click: async () => {
        const { clipboard } = await import("electron");
        const token = await getIngestToken();
        if (token) {
          clipboard.writeText(pairingString(token));
        }
      },
    },
    {
      label: "Rotate Ingest Token…",
      click: async () => {
        await rotateIngestToken();
        refresh();
      },
    },
    { type: "separator" },
    {
      label: "Launch on startup",
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
    { label: "Quit", accelerator: "CommandOrControl+Q", role: "quit" },
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

// A small color thumbnail for the save's cover, sized for a menu item. Returns
// null for non-image covers or missing files so the item simply renders text.
function loadThumb(
  id: string,
  files: SaveFile[] | null | undefined,
  coverIndex: number | null | undefined,
): NativeImage | null {
  try {
    const list = files ?? [];
    const cover = list[coverIndex ?? 0] ?? list[0];
    if (!cover) return null;
    const path = itemFile(id, cover.path);
    if (!existsSync(path)) return null;
    const img = nativeImage.createFromPath(path);
    if (img.isEmpty()) return null;
    return img.resize({ width: 16, height: 16, quality: "good" });
  } catch {
    return null;
  }
}

function pairingString(token: string): string {
  const url = new URL("pond://pair");
  url.searchParams.set("port", String(DEFAULT_INGEST_PORT));
  url.searchParams.set("token", token);
  return url.toString();
}
