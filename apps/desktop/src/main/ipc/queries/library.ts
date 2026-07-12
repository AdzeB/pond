import type { QueryHandlerMap } from "../helpers";
import { libraryLocationQueries } from "./library-locations";
import { libraryMaintenanceQueries } from "./library-maintenance";

export const libraryQueries: QueryHandlerMap = {
  ...libraryLocationQueries,
  ...libraryMaintenanceQueries,
};
