import { SOURCES, type Source } from "./db";
import { descriptorFor, SOURCE_DESCRIPTORS } from "./sources/registry";

export {
  canonicalHost,
  domainFromUrl,
  sourceIdentity,
} from "./domain";
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

const SOURCE_ALIASES = new Map<string, Source>([
  ["x", "twitter"],
  ["are.na", "arena"],
]);

const SOURCE_LABELS = new Map<string, string>(
  SOURCE_DESCRIPTORS.map((d) => [d.id, d.label]),
);
SOURCE_LABELS.set("web", "Web");
SOURCE_LABELS.set("local", "Local");

export function isSource(value: string): value is Source {
  return SOURCE_SET.has(value);
}

export function resolveSourceId(value: string): Source | null {
  const key = value.toLowerCase();
  const normalized = SOURCE_ALIASES.get(key) ?? key;
  return isSource(normalized) ? normalized : null;
}

export function sourceLabel(source: Source): string {
  return SOURCE_LABELS.get(source) ?? source;
}

export function sourceIdFromUrl(source: Source, rawUrl: string): string | null {
  if (source === "local") return null;
  let href: string;
  try {
    href = new URL(rawUrl).href;
  } catch {
    return null;
  }
  if (source === "web") return href;
  for (const rx of descriptorFor(source).urlPatterns) {
    const match = rx.exec(href);
    if (match?.[1]) return match[1];
  }
  return null;
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
