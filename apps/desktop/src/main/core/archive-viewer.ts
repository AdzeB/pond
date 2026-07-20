/** Locks <webview> guests to the pond://_replay archive viewer and routes outbound navigations back to the renderer. */
import {
  type BrowserWindow,
  clipboard,
  Menu,
  type MenuItemConstructorOptions,
  shell,
  type WebContents,
} from "electron";
import log from "electron-log/main.js";
import { IPC } from "../../shared/constants";

function httpUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

/** Copy/open actions for replayed pages; opening stays http(s)-only, matching the attach hardening. */
function attachGuestContextMenu(guest: WebContents): void {
  guest.on("context-menu", (_event, params) => {
    const template: MenuItemConstructorOptions[] = [];
    const link = httpUrl(params.linkURL);

    if (params.selectionText.trim().length > 0) {
      template.push({ role: "copy" });
    }
    if (link) {
      template.push({
        label: "Copy Link",
        click: () => clipboard.writeText(link),
      });
    }
    if (params.mediaType === "image") {
      template.push({
        label: "Copy Image",
        click: () => guest.copyImageAt(params.x, params.y),
      });
    }
    if (link) {
      if (template.length > 0) template.push({ type: "separator" });
      template.push({
        label: "Open Link in Browser",
        click: () => void shell.openExternal(link),
      });
    }

    if (template.length > 0) Menu.buildFromTemplate(template).popup();
  });
}

export function hardenArchiveWebviews(win: BrowserWindow): void {
  win.webContents.on("will-attach-webview", (event, webPreferences, params) => {
    /** Never trust guest params from the renderer; re-assert isolation and drop any preload. */
    delete webPreferences.preload;
    webPreferences.nodeIntegration = false;
    webPreferences.contextIsolation = true;
    webPreferences.sandbox = true;
    if (typeof params.src === "string" && !params.src.startsWith("pond://")) {
      log.warn("[pond archive] blocked webview attach", params.src);
      event.preventDefault();
    }
  });

  win.webContents.on("did-attach-webview", (_event, guest) => {
    attachGuestContextMenu(guest);
    guest.setWindowOpenHandler(({ url }) => {
      forwardNavigation(win, guest.id, url);
      return { action: "deny" };
    });
    /** Replayed sites can script top-level navigations; keep the guest on the viewer and let the renderer decide what to do with the target. */
    guest.on("will-navigate", (event, url) => {
      if (url.startsWith("pond://")) return;
      event.preventDefault();
      forwardNavigation(win, guest.id, url);
    });
  });
}

function forwardNavigation(
  win: BrowserWindow,
  guestId: number,
  url: string,
): void {
  if (win.isDestroyed()) return;
  win.webContents.send(IPC.archiveNavigate, { guestId, url });
}
