import type { Save, SyncAction } from "@pond/schema/db";
import { BrowserWindow, Notification } from "electron";
import log from "electron-log/main.js";
import { IPC } from "../../shared/constants";
import { registerSyncActionListener } from "./executor";
import { getPrefs } from "./prefs";
import { sourceLabel } from "./refresh/sources";
import { setSaveHudActivation, showSaveHud } from "./save-hud";

export interface SaveCompleteNotifierOptions {
  focusMainWindow: () => Promise<BrowserWindow | null> | BrowserWindow | null;
}

let started = false;

export function startSaveCompleteNotifier(
  opts: SaveCompleteNotifierOptions,
): void {
  if (started) return;
  started = true;

  setSaveHudActivation((saveId) => {
    void activateSave(saveId, opts).catch((err) => {
      log.warn("[pond notifications] hud activation failed", err);
    });
  });

  registerSyncActionListener((action) => {
    void handleAction(action, opts).catch((err) => {
      log.warn("[pond notifications] handler threw", err);
    });
  });
}

async function activateSave(
  saveId: string,
  opts: SaveCompleteNotifierOptions,
): Promise<void> {
  const win = await opts.focusMainWindow();
  if (!win || win.isDestroyed()) return;
  win.webContents.send(IPC.nav, `/save/${encodeURIComponent(saveId)}`);
}

async function handleAction(
  action: SyncAction,
  opts: SaveCompleteNotifierOptions,
): Promise<void> {
  if (action.modelName !== "save" || action.action !== "I") return;

  const save = action.data as Partial<Save> | null;
  if (!save?.id || !save.source) return;

  if (!Notification.isSupported()) return;

  const focused = BrowserWindow.getFocusedWindow();
  if (focused && !focused.isDestroyed() && focused.isVisible()) {
    return;
  }

  const prefs = await getPrefs();
  if (!prefs.notifications.saveComplete) return;

  const title = `Saved from ${sourceLabel(save.source)}`;
  const body = pickBody(save);

  if (prefs.notifications.style === "hud") {
    await showSaveHud({
      id: save.id,
      source: save.source,
      avatarUrl: pickAvatarUrl(save),
    });
    return;
  }

  const notification = new Notification({
    title,
    body,
    silent: !prefs.notifications.sound,
  });

  const route = `/save/${encodeURIComponent(save.id)}`;
  notification.on("click", () => {
    void (async () => {
      try {
        const win = await opts.focusMainWindow();
        if (!win || win.isDestroyed()) return;
        win.webContents.send(IPC.nav, route);
      } catch (err) {
        log.warn("[pond notifications] click handler failed", err);
      }
    })();
  });

  notification.show();
}

// Best-effort avatar for the HUD: a local avatar file if the pipeline already
// wrote one, else the remote author avatar captured in rawJson. Usually absent
// at insert time (assets arrive moments later), in which case the HUD shows just
// the source glyph.
function pickAvatarUrl(save: Partial<Save>): string | null {
  const files = (save as { files?: Array<{ kind?: string; path?: string }> })
    .files;
  const avatar = files?.find(
    (f) => f.kind === "avatar" && typeof f.path === "string",
  );
  if (avatar?.path && save.id) {
    const encoded = avatar.path.split("/").map(encodeURIComponent).join("/");
    return `pond://${save.id}/${encoded}`;
  }
  const remote = (
    save as {
      rawJson?: { capture?: { author?: { avatarUrl?: unknown } } };
    }
  ).rawJson?.capture?.author?.avatarUrl;
  if (typeof remote === "string" && remote.trim().length > 0) return remote;
  return null;
}

function pickBody(save: Partial<Save>): string {
  const title = trim(save.title);
  if (title) return title;
  const description = trim(save.description);
  if (description) return description;
  const host = hostFromUrl(save.url);
  if (host) return host;
  return "Tap to open in pond.";
}

function trim(value: string | null | undefined): string | null {
  if (!value) return null;
  const collapsed = value.replace(/\s+/g, " ").trim();
  if (!collapsed) return null;
  return collapsed.length > 140 ? `${collapsed.slice(0, 137)}…` : collapsed;
}

function hostFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
