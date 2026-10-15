import { EXTERNAL_SOURCE_IDS, SOURCE_DESCRIPTORS } from "./sources/registry";
export const SOURCES = [...EXTERNAL_SOURCE_IDS, "web", "local"] as const;
export type Source = (typeof SOURCES)[number];

const SOURCE_LABELS = new Map<string, string>(
  SOURCE_DESCRIPTORS.map((d) => [d.id, d.label]),
);
SOURCE_LABELS.set("web", "Web");
SOURCE_LABELS.set("local", "Local");

export function sourceLabel(source: Source): string {
  return SOURCE_LABELS.get(source) ?? source;
}
