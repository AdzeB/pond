import type { Source } from "@pond/schema/db";
import { hostToSource } from "@pond/schema/sources";
import { WATCHABLE } from "@/features/sources/hooks/use-watches";

export function watchInputSource(
  input: string,
):
  | { type: "link"; source: Source }
  | { type: "unsupported" }
  | { type: "handle" } {
  const value = input.trim();
  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value);
  if (hasScheme && !/^https?:\/\//i.test(value)) return { type: "unsupported" };
  const candidate = hasScheme ? value : `https://${value}`;
  const source = hostToSource(candidate);
  if (source && WATCHABLE.includes(source)) {
    return { type: "link", source };
  }
  return hasScheme || value.startsWith("www.")
    ? { type: "unsupported" }
    : { type: "handle" };
}
