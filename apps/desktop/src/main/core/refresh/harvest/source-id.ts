import type { ExternalSource } from "@pond/schema/sources";
import { sourceIdFromUrl as parseSourceId } from "@pond/schema/sources";

export function bindSourceId(source: ExternalSource) {
  return (url: string): string | null => parseSourceId(source, url);
}
