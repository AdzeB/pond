import type { SaveFile } from "@pond/schema/db";
import { isAuxiliaryKind } from "@shared/save-file-names";
import type { QueryResults } from "../../shared/query-contracts";

interface ExactGroupIndex {
  ids: string[];
}
interface Row {
  id: string;
  files: SaveFile[];
  phash: string | null;
}
interface HashNode {
  hash: bigint;
  ids: string[];
  children: Map<number, HashNode>;
}
function distance(a: bigint, b: bigint): number {
  let bits = a ^ b;
  let count = 0;
  while (bits) {
    bits &= bits - 1n;
    count++;
  }
  return count;
}
export function duplicateGroups(
  rows: readonly Row[],
  options: { visualDistance?: number } = {},
): QueryResults["saves.findDuplicates"] {
  const visualDistance = Math.max(
    0,
    Math.min(64, Math.round(options.visualDistance ?? 6)),
  );
  const exact = new Map<string, ExactGroupIndex>();
  const exactKey = new Map<string, string>();
  const hashes = new Map<string, string[]>();
  let visualIndexed = 0;
  for (const row of rows) {
    const files = row.files.filter((file) => !isAuxiliaryKind(file.kind));
    if (files.length && files.every((file) => !!file.sha256)) {
      const sha256 = files.map((file) => file.sha256.toLowerCase()).sort();
      const key = sha256.join(":");
      const group = exact.get(key) ?? { ids: [] };
      group.ids.push(row.id);
      exact.set(key, group);
      exactKey.set(row.id, key);
    }
    if (row.phash && /^[a-f0-9]{16}$/i.test(row.phash)) {
      visualIndexed++;
      const key = row.phash.toLowerCase();
      const ids = hashes.get(key) ?? [];
      ids.push(row.id);
      hashes.set(key, ids);
    }
  }
  const groups: QueryResults["saves.findDuplicates"]["groups"] = [
    ...exact.values(),
  ]
    .filter((group) => group.ids.length > 1)
    .map((group) => ({
      kind: "exact" as const,
      ids: group.ids,
      evidence: { sha256Equal: true },
    }));
  let root: HashNode | null = null;
  const nodes: HashNode[] = [];
  for (const [hash, ids] of hashes) {
    const next: HashNode = {
      hash: BigInt(`0x${hash}`),
      ids,
      children: new Map(),
    };
    nodes.push(next);
    if (!root) {
      root = next;
      continue;
    }
    let node = root;
    for (;;) {
      const d = distance(node.hash, next.hash);
      const child = node.children.get(d);
      if (child) node = child;
      else {
        node.children.set(d, next);
        break;
      }
    }
  }
  const assigned = new Set<string>();
  for (const anchor of nodes) {
    const anchorId = anchor.ids.find((id) => !assigned.has(id));
    if (!anchorId || !root) continue;
    const related: Array<{ id: string; distance: number }> = [];
    const stack = [root];
    while (stack.length) {
      const node = stack.pop();
      if (!node) break;
      const d = distance(anchor.hash, node.hash);
      if (d <= visualDistance)
        related.push(
          ...node.ids
            .filter((id) => !assigned.has(id))
            .map((id) => ({ id, distance: d })),
        );
      for (const [edge, child] of node.children)
        if (edge >= d - visualDistance && edge <= d + visualDistance)
          stack.push(child);
    }
    const firstKey = exactKey.get(anchorId);
    const onlyExact =
      !!firstKey && related.every(({ id }) => exactKey.get(id) === firstKey);
    if (related.length < 2 || onlyExact) continue;
    for (const { id } of related) assigned.add(id);
    groups.push({
      kind: "visual-near",
      ids: [
        anchorId,
        ...related.filter(({ id }) => id !== anchorId).map(({ id }) => id),
      ],
      evidence: {
        distance: Math.max(...related.map((candidate) => candidate.distance)),
      },
    });
  }
  return { groups, visualIndexed, total: rows.length, visualDistance };
}
