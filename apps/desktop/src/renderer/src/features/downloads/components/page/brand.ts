import type { Source } from "@pond/schema/db";
import { hostToSource } from "@pond/schema/sources";

export function downloadBrandSource(source: Source, url: string): Source {
  return hostToSource(url) ?? source;
}
