import { BrowserWindow } from "electron";
import log from "electron-log/main.js";
import { IPC } from "../shared/constants";

// A deep link that arrived before any window existed; replayed on first load.
let pendingDeepLink: string | null = null;

// createWindow drains this on `did-finish-load` so the initial route is applied
// once the renderer is ready.
export function consumePendingDeepLink(): string | null {
  const route = pendingDeepLink;
  pendingDeepLink = null;
  return route;
}

export function handleDeepLink(
  url: string,
  mainWindow: BrowserWindow | null,
): void {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "pond:") return;
    let route: string | null = null;
    if (parsed.hostname === "" || parsed.hostname === "library") {
      route = "/";
    } else if (parsed.hostname === "item") {
      const id = parsed.pathname.replace(/^\//, "");
      if (id) route = `/save/${encodeURIComponent(id)}`;
    } else if (parsed.hostname === "search") {
      const q = parsed.searchParams.get("q") ?? "";
      route = `/?q=${encodeURIComponent(q)}`;
    } else if (parsed.hostname === "capture") {
      const target = parsed.searchParams.get("url") ?? "";
      route = `/?capture=1${target ? `&url=${encodeURIComponent(target)}` : ""}`;
    } else if (parsed.hostname === "pair") {
      const token = parsed.searchParams.get("token") ?? "";
      route = `/settings/general${token ? `?token=${encodeURIComponent(token)}` : ""}`;
    } else if (parsed.hostname === "settings") {
      const sub = parsed.pathname.replace(/^\//, "").replace(/\/+$/, "");
      route = sub ? `/settings/${sub}` : "/settings";
    }
    if (!route) {
      log.info("[pond deep-link] ignored", url);
      return;
    }
    log.info("[pond deep-link] route", route);
    const target =
      mainWindow && !mainWindow.isDestroyed()
        ? mainWindow
        : (BrowserWindow.getAllWindows().find((w) => !w.isDestroyed()) ?? null);
    if (!target) {
      pendingDeepLink = route;
      return;
    }
    if (target.isMinimized()) target.restore();
    target.show();
    target.focus();
    target.webContents.send(IPC.nav, route);
  } catch (err) {
    log.warn("[pond deep-link] parse failed", url, err);
  }
}
