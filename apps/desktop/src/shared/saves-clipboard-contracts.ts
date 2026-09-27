import type { OkResult } from "./query-contracts-shared";
import type { SavesFileInput } from "./saves-contracts-shared";

export interface SavesClipboardQueryInputs {
  "saves.copyImage": SavesFileInput;
  "saves.copyThumbnail": { id: string };
  "saves.copyBase64": SavesFileInput;
  "saves.copyFile": SavesFileInput;
  "saves.copyFiles": { files: SavesFileInput[] };
  "clipboard.writeText": { text: string };
}

export interface SavesClipboardQueryResults {
  "saves.copyImage": OkResult;
  "saves.copyThumbnail": OkResult;
  "saves.copyBase64": OkResult;
  "saves.copyFile": OkResult;
  "saves.copyFiles": OkResult & { copied?: number };
  "clipboard.writeText": OkResult;
}
