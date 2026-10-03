export type ScreenshotMode = "area" | "window" | "screen";

export interface ScreenshotDraft {
  token: string;
  preview: string;
  width: number;
  height: number;
  title: string;
  tags: string[];
}

export type ScreenshotCaptureResult =
  | { kind: "organizing" }
  | { kind: "cancelled" }
  | { kind: "saved"; id: string }
  | { kind: "draft"; draft: ScreenshotDraft }
  | { kind: "unsupported" };

export interface ScreenshotSaveInput {
  token: string;
  title?: string;
  notes?: string;
  tags?: string[];
  folderId?: string | null;
  rating?: number;
}
