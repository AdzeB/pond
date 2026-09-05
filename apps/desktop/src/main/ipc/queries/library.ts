import { libraryLocationQueries } from "./library-locations";
import { libraryMaintenanceQueries } from "./library-maintenance";
import type { QueryHandlerMap } from "./params";

export const libraryQueries = {
  ...libraryLocationQueries,
  ...libraryMaintenanceQueries,
} satisfies QueryHandlerMap;
