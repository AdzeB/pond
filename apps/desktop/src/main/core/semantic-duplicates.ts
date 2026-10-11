import { normalizedEmbeddingVector } from "../../shared/embeddings";

export type DuplicateEvidenceKind = "exact" | "visual-near" | "semantic-near";

export function classifyDuplicateEvidence(evidence: {
  sha256Equal?: boolean;
  phashDistance?: number;
  semanticDistance?: number;
}): DuplicateEvidenceKind | null {
  if (evidence.sha256Equal === true) return "exact";
  if (
    evidence.phashDistance !== undefined &&
    Number.isFinite(evidence.phashDistance)
  )
    return "visual-near";
  if (
    evidence.semanticDistance !== undefined &&
    Number.isFinite(evidence.semanticDistance)
  )
    return "semantic-near";
  return null;
}

export interface SemanticDuplicateCandidate {
  sourceId: string;
  targetId: string;
  model: string;
  distance: number;
}

export interface SemanticDuplicateGroup {
  kind: "semantic-near";
  ids: [string, string];
  evidence: { model: string; distance: number };
}

const DEFAULT_SEMANTIC_DISTANCE = 0.04;

function orderedPair(left: string, right: string): [string, string] {
  return left < right ? [left, right] : [right, left];
}

function pairKey(left: string, right: string): string {
  const [first, second] = orderedPair(left, right);
  return `${first}\u0000${second}`;
}

export function semanticDuplicateGroups(
  candidates: readonly SemanticDuplicateCandidate[],
  options: {
    model: string;
    maximumDistance?: number;
    excludedPairs?: readonly (readonly [string, string])[];
  },
): SemanticDuplicateGroup[] {
  const maximumDistance = Math.max(
    0,
    options.maximumDistance ?? DEFAULT_SEMANTIC_DISTANCE,
  );
  const excluded = new Set(
    options.excludedPairs?.map(([left, right]) => pairKey(left, right)) ?? [],
  );
  const nearestByPair = new Map<string, SemanticDuplicateGroup>();

  for (const candidate of candidates) {
    if (
      candidate.model !== options.model ||
      candidate.sourceId === candidate.targetId ||
      !Number.isFinite(candidate.distance) ||
      candidate.distance < 0 ||
      candidate.distance > maximumDistance
    )
      continue;
    const key = pairKey(candidate.sourceId, candidate.targetId);
    if (excluded.has(key)) continue;
    const current = nearestByPair.get(key);
    if (current && current.evidence.distance <= candidate.distance) continue;
    nearestByPair.set(key, {
      kind: "semantic-near",
      ids: orderedPair(candidate.sourceId, candidate.targetId),
      evidence: { model: candidate.model, distance: candidate.distance },
    });
  }

  return [...nearestByPair.values()].sort(
    (left, right) =>
      left.evidence.distance - right.evidence.distance ||
      left.ids[0].localeCompare(right.ids[0]) ||
      left.ids[1].localeCompare(right.ids[1]),
  );
}

export interface SemanticDuplicateRow {
  id: string;
  vector: number[] | null;
  model: string | null;
  status: string;
}

export interface SemanticDuplicateNeighborStore {
  neighbors(
    vector: number[],
    limit: number,
  ): Array<{ id: string; distance: number }>;
}

export function findSemanticDuplicateGroups(
  rows: readonly SemanticDuplicateRow[],
  store: SemanticDuplicateNeighborStore,
  options: {
    model: string;
    maximumDistance?: number;
    excludedPairs?: readonly (readonly [string, string])[];
    neighborsPerSave?: number;
  },
): SemanticDuplicateGroup[] {
  const eligible = new Map<string, number[]>();
  for (const row of rows) {
    if (row.status !== "complete" || row.model !== options.model || !row.vector)
      continue;
    try {
      eligible.set(row.id, normalizedEmbeddingVector(row.vector));
    } catch {
      /** A malformed derived vector is ignored until enrichment replaces it. */
    }
  }

  const candidates: SemanticDuplicateCandidate[] = [];
  for (const [sourceId, vector] of [...eligible].sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    for (const neighbor of store.neighbors(
      vector,
      Math.max(2, Math.floor(options.neighborsPerSave ?? 9)),
    )) {
      if (!eligible.has(neighbor.id) || sourceId === neighbor.id) continue;
      candidates.push({
        sourceId,
        targetId: neighbor.id,
        model: options.model,
        distance: neighbor.distance,
      });
    }
  }

  return semanticDuplicateGroups(candidates, options);
}
