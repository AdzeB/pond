import { SOURCES, type Source } from "./db";
import { SOURCE_DESCRIPTORS } from "./sources/registry";

export {
  DEFAULT_RATE_PROFILE,
  descriptorFor,
  EXTERNAL_SOURCE_IDS,
  type ExternalSource,
  SOURCE_DESCRIPTORS,
  syncConfigFor,
} from "./sources/registry";
export type {
  RateProfile,
  SourceDescriptor,
  SourceSyncConfig,
  SourceSyncOverride,
  SyncStrategy,
} from "./sources/types";

const SOURCE_SET: ReadonlySet<string> = new Set(SOURCES);

const SOURCE_LABELS = new Map<string, string>(
  SOURCE_DESCRIPTORS.map((d) => [d.id, d.label]),
);
SOURCE_LABELS.set("web", "Web");
SOURCE_LABELS.set("local", "Local");

export function isSource(value: string): value is Source {
  return SOURCE_SET.has(value);
}

export function sourceLabel(source: Source): string {
  return SOURCE_LABELS.get(source) ?? source;
}

export function hostToSource(rawUrl: string): Source | null {
  let host: string;
  try {
    host = new URL(rawUrl).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
  for (const descriptor of SOURCE_DESCRIPTORS) {
    for (const owned of descriptor.hosts) {
      if (host === owned || host.endsWith(`.${owned}`)) return descriptor.id;
    }
  }
  return null;
}
