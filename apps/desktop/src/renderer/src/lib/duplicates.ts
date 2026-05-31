import type { Save } from "@/pool/types";
import { hammingDistance } from "./phash";

export interface DuplicateGroup {
  key: string;
  saves: Save[];
}

// Exact duplicates: saves sharing any identical file sha256.
export function groupExactDuplicates(
  saves: ReadonlyArray<Save>,
): DuplicateGroup[] {
  const byHash = new Map<string, Save[]>();
  for (const s of saves) {
    if (s.deletedAt) continue;
    for (const f of s.files ?? []) {
      if (!f.sha256) continue;
      const arr = byHash.get(f.sha256) ?? [];
      if (!arr.includes(s)) arr.push(s);
      byHash.set(f.sha256, arr);
    }
  }
  return Array.from(byHash.entries())
    .filter(([, arr]) => arr.length > 1)
    .map(([key, arr]) => ({ key, saves: arr }));
}

// Similar images: single-link clustering over aHash within `threshold` bits.
const DEFAULT_THRESHOLD = 8;

export function clusterSimilar(
  saves: ReadonlyArray<Save>,
  threshold = DEFAULT_THRESHOLD,
): DuplicateGroup[] {
  const items = saves.filter((s) => !s.deletedAt && s.phash);
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let r = x;
    while (parent.get(r) && parent.get(r) !== r) r = parent.get(r) as string;
    return r;
  };
  const union = (a: string, b: string) => {
    parent.set(find(a), find(b));
  };
  for (const s of items) parent.set(s.id, s.id);

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      if (!a || !b) continue;
      if (hammingDistance(a.phash as string, b.phash as string) <= threshold) {
        union(a.id, b.id);
      }
    }
  }

  const byRoot = new Map<string, Save[]>();
  for (const s of items) {
    const root = find(s.id);
    const arr = byRoot.get(root) ?? [];
    arr.push(s);
    byRoot.set(root, arr);
  }
  return Array.from(byRoot.entries())
    .filter(([, arr]) => arr.length > 1)
    .map(([key, arr]) => ({ key, saves: arr }));
}
