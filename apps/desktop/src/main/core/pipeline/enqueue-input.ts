import type { ListKind, Source } from "@pond/schema/db";
import { mergeListKinds } from "@pond/schema/list-kinds";
import type { ImportableCookie } from "../refresh/harvest-window/session";
import { classifyUrlToSource } from "./extractors";
import { listKindsFromTrigger } from "./list-kinds";
import type { EnqueueSeed } from "./seed";
import { sourceIdFromUrl } from "./url";

export interface EnqueueItem {
  url: string;
  seed?: EnqueueSeed;
  listKinds?: ListKind[];
}

export interface EnqueueOptions {
  trigger?: string;
  force?: boolean;
  seed?: EnqueueSeed;
  accountId?: string | null;
  generationId?: string | null;
  cookies?: ImportableCookie[];
  listKinds?: ListKind[];
}

export interface EnqueueCandidate {
  url: string;
  source: Source;
  sourceId: string;
  seed?: EnqueueSeed;
  listKinds: ListKind[];
}

export interface NormalizedEnqueueItems {
  candidates: EnqueueCandidate[];
  failed: number;
}

export function normalizeUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    url.hash = "";
    for (const key of Array.from(url.searchParams.keys())) {
      if (
        key.startsWith("utm_") ||
        key === "fbclid" ||
        key === "igshid" ||
        key === "si"
      ) {
        url.searchParams.delete(key);
      }
    }
    return url.toString();
  } catch {
    return rawUrl;
  }
}

export function enqueueCandidateKey(
  candidate: Pick<EnqueueCandidate, "source" | "sourceId">,
): string {
  return `${candidate.source}\u0000${candidate.sourceId}`;
}

export function normalizeEnqueueItems(
  items: readonly EnqueueItem[],
  trigger: string | undefined,
): NormalizedEnqueueItems {
  const candidates: EnqueueCandidate[] = [];
  const byKey = new Map<string, EnqueueCandidate>();
  let failed = 0;

  for (const item of items) {
    const url = normalizeUrl(item.url);
    const { source } = classifyUrlToSource(url);
    if (!source) {
      failed += 1;
      continue;
    }
    const sourceId = sourceIdFromUrl(source, url);
    if (!sourceId) {
      failed += 1;
      continue;
    }
    const listKinds = mergeListKinds(
      item.listKinds,
      listKindsFromTrigger(trigger),
    );
    const key = enqueueCandidateKey({ source, sourceId });
    const previous = byKey.get(key);
    if (previous) {
      previous.listKinds = mergeListKinds(previous.listKinds, listKinds);
      continue;
    }
    const candidate: EnqueueCandidate = {
      url,
      source,
      sourceId,
      listKinds,
    };
    if (item.seed) candidate.seed = item.seed;
    byKey.set(key, candidate);
    candidates.push(candidate);
  }

  return { candidates, failed };
}
