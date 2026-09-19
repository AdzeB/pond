import type { QueryHandlerMap } from "./params";
import { savesClipboardQueries } from "./saves-clipboard";
import { savesExportQueries } from "./saves-export";
import { savesFontQueries } from "./saves-fonts";
import { savesImportQueries } from "./saves-import";
import { savesMutationQueries } from "./saves-mutation";
import { savesReadQueries } from "./saves-read";

export const savesQueries = {
  ...savesReadQueries,
  ...savesMutationQueries,
  ...savesImportQueries,
  ...savesExportQueries,
  ...savesFontQueries,
  ...savesClipboardQueries,
} satisfies QueryHandlerMap;
