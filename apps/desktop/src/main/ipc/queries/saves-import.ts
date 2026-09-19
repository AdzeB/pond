import type { QueryHandlerMap } from "./params";
import { savesImportClipboardQueries } from "./saves-import-clipboard";
import { savesImportPersistenceQueries } from "./saves-import-persistence";
import { savesImportSourceQueries } from "./saves-import-sources";
import { savesImportTransferQueries } from "./saves-import-transfer";

export const savesImportQueries = {
  "saves.copyToLibrary": savesImportTransferQueries["saves.copyToLibrary"],
  "saves.importPackage": savesImportTransferQueries["saves.importPackage"],
  "saves.pickImportPaths": savesImportTransferQueries["saves.pickImportPaths"],
  "saves.classifyUrl": savesImportSourceQueries["saves.classifyUrl"],
  "saves.importFiles": savesImportTransferQueries["saves.importFiles"],
  "saves.setCustomThumbnail":
    savesImportPersistenceQueries["saves.setCustomThumbnail"],
  "saves.setGifThumbnail":
    savesImportPersistenceQueries["saves.setGifThumbnail"],
  "saves.loadSubtitles": savesImportPersistenceQueries["saves.loadSubtitles"],
  "saves.replaceFile": savesImportPersistenceQueries["saves.replaceFile"],
  "saves.removeCustomThumbnail":
    savesImportPersistenceQueries["saves.removeCustomThumbnail"],
  "saves.createManual": savesImportPersistenceQueries["saves.createManual"],
  "saves.listBlankDocuments":
    savesImportPersistenceQueries["saves.listBlankDocuments"],
  "saves.createBlankDocument":
    savesImportPersistenceQueries["saves.createBlankDocument"],
  "saves.combineImages": savesImportPersistenceQueries["saves.combineImages"],
  "saves.pickEagleLibrary": savesImportSourceQueries["saves.pickEagleLibrary"],
  "saves.importEagleLibrary":
    savesImportSourceQueries["saves.importEagleLibrary"],
  "saves.importClipboard": savesImportClipboardQueries["saves.importClipboard"],
  "saves.startDrag": savesImportTransferQueries["saves.startDrag"],
  "saves.quickAdd": savesImportSourceQueries["saves.quickAdd"],
  "saves.importBookmarks": savesImportSourceQueries["saves.importBookmarks"],
  "saves.extractPageAssets":
    savesImportSourceQueries["saves.extractPageAssets"],
} satisfies QueryHandlerMap;
