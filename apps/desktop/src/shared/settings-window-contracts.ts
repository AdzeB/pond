import { z } from "zod";

export const SETTINGS_WINDOW_IPC = {
  open: "pond:settings-window-open",
  location: "pond:settings-window-location",
  ready: "pond:settings-window-ready",
  close: "pond:settings-window-close",
  processingReady: "pond:settings-processing-ready",
  processingCheck: "pond:settings-processing-check",
  processingStatus: "pond:settings-processing-status",
  prefsChanged: "pond:prefs-changed",
} as const;

export const SettingsWindowLocationSchema = z.object({
  section: z.string().max(100).optional(),
  hash: z.string().max(300).optional(),
});
export type SettingsWindowLocation = z.infer<
  typeof SettingsWindowLocationSchema
>;

export const SETTINGS_QUERY_NAMES: ReadonlySet<string> = new Set([
  "settings.get",
  "settings.getPrefs",
  "settings.setPrefs",
  "settings.setVideoDownload",
  "settings.setImageDownload",
  "settings.ingestToken",
  "settings.rotateIngestToken",
  "settings.globalShortcutStatus",
  "agent.keys",
  "agent.listModels",
  "agent.saveKey",
  "agent.removeKey",
  "agent.setKeyEnabled",
  "agent.mcpSnippet",
  "agent.openMcpInstall",
  "clipboard.writeText",
  "library.info",
  "library.recent",
  "library.switchTo",
  "library.rename",
  "library.identity.update",
  "library.identity.pickIcon",
  "library.create",
  "library.open",
  "library.merge",
  "library.importEagle",
  "library.exportPackage",
  "library.importPackage",
  "library.backupTo",
  "library.restoreBackup",
  "library.move",
  "library.openInFinder",
  "storage.snapshot",
  "screenshots.status",
  "screenshots.set",
  "screenshots.pickFolder",
  "folders.list",
  "notifications.openSettings",
  "feedback.emit",
  "system.applyPrefs",
  "window.applyPrefs",
  "updates.applyPrefs",
  "updates.checkNow",
  "quickCapture.applyPrefs",
]);

export const SettingsProcessingStatusSchema = z.object({
  inflight: z.number().int().nonnegative(),
  activeKeys: z.array(z.string()),
  failedKeys: z.array(z.string()),
});
export type SettingsProcessingStatus = z.infer<
  typeof SettingsProcessingStatusSchema
>;
