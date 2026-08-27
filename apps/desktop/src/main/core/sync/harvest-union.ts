import type { ListKind } from "@pond/schema/db";
import { mergeListKinds } from "@pond/schema/list-kinds";

export function unionById<T>(
  primary: T[],
  extra: T[],
  id: (entry: T) => string,
  merge?: (kept: T, incoming: T) => T,
): T[] {
  const out = [...primary];
  const indexById = new Map<string, number>();
  for (const [i, entry] of out.entries()) {
    const key = id(entry);
    if (!indexById.has(key)) indexById.set(key, i);
  }
  for (const entry of extra) {
    const key = id(entry);
    const idx = indexById.get(key);
    if (idx === undefined) {
      indexById.set(key, out.length);
      out.push(entry);
      continue;
    }
    const kept = out[idx];
    if (merge && kept) out[idx] = merge(kept, entry);
  }
  return out;
}

export function stampListKind<T>(
  entries: T[],
  kind: ListKind,
): Array<T & { listKinds: ListKind[] }> {
  return entries.map((entry) => ({
    ...entry,
    listKinds: mergeListKinds(
      (entry as { listKinds?: ListKind[] }).listKinds,
      kind,
    ),
  }));
}

export function mergeEntryListKinds<T extends { listKinds?: ListKind[] }>(
  kept: T,
  incoming: T,
): T {
  return {
    ...kept,
    listKinds: mergeListKinds(kept.listKinds, incoming.listKinds),
  };
}
