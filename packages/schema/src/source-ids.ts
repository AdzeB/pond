import { EXTERNAL_SOURCE_IDS } from "./sources/registry";
export const SOURCES = [...EXTERNAL_SOURCE_IDS, "web", "local"] as const;
export type Source = (typeof SOURCES)[number];
