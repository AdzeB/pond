import type { OkResult } from "./query-contracts-shared";
import type { SavesFileInput, SavesIdsInput } from "./saves-contracts-shared";

export interface SavesExportQueryInputs {
  "saves.exportEaglePackage": SavesIdsInput;
  "saves.exportPackage": SavesIdsInput & { password?: string };
  "saves.exportFile": SavesFileInput;
  "saves.share": { id: string; fileIndex?: number };
  "saves.exportFiles": SavesIdsInput;
  "saves.exportWebp": SavesIdsInput;
  "saves.exportCsv": SavesIdsInput;
}

export interface SavesExportQueryResults {
  "saves.exportEaglePackage": {
    ok: boolean;
    path?: string;
    exported?: number;
    error?: string;
  };
  "saves.exportPackage": {
    ok: boolean;
    path?: string;
    exported?: number;
    recoveryKey?: string;
    error?: string;
  };
  "saves.exportFile": OkResult & { path?: string };
  "saves.share": OkResult & { error?: string };
  "saves.exportFiles": OkResult & { exported?: number; dir?: string };
  "saves.exportWebp": OkResult & { exported?: number; dir?: string };
  "saves.exportCsv": OkResult & { count?: number; path?: string };
}
