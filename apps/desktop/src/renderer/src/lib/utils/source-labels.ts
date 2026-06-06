import { isSource, sourceLabel } from "@pond/schema/sources";

const ALIASES: Record<string, string> = {
  x: "twitter",
  "are.na": "arena",
};

export function getSourceLabel(source: string): string {
  const key = source.toLowerCase();
  const normalized = ALIASES[key] ?? key;
  if (isSource(normalized)) return sourceLabel(normalized);
  return source.charAt(0).toUpperCase() + source.slice(1);
}
