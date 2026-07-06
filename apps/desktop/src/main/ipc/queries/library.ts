import type { QueryHandlerMap } from "../helpers";
import { libraryLocationQueries } from "./library-locations";
import { libraryMaintenanceQueries } from "./library-maintenance";
import { libraryRegistryQueries } from "./library-registry";

export const libraryQueries: QueryHandlerMap = {
  ...libraryLocationQueries,
  ...libraryRegistryQueries,
  ...libraryMaintenanceQueries,
};
