export const FEEDBACK_EVENTS = [
  "saveDeletion",
  "folderDeletion",
  "extensionCapture",
  "autoImport",
] as const;

export type FeedbackEvent = (typeof FEEDBACK_EVENTS)[number];
