import type { QueryName } from "./query-contracts";
import type { ScreenshotDraft } from "./screenshot-capture";

export const SCREENSHOT_WINDOW_IPC = {
  draft: "pond:screenshot-window:draft",
  close: "pond:screenshot-window:close",
  invalidated: "pond:screenshot-window:invalidated",
} as const;

export const SCREENSHOT_QUERY_NAMES: ReadonlySet<QueryName> = new Set([
  "screenshots.finish",
  "screenshots.discard",
  "settings.getPrefs",
  "folders.list",
  "folders.memberships",
  "folders.create",
  "tags.list",
  "tags.create",
  "tagGroups.list",
  "tagGroups.addTags",
]);

export interface ScreenshotWindowApi {
  draft(): Promise<ScreenshotDraft | null>;
  close(): Promise<void>;
  onInvalidated(listener: (message: string) => void): () => void;
}
