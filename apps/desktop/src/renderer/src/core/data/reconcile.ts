import { deleteSave, pool, upsertSave } from "./pool";
import type { Save } from "./types";

export interface SyncActionEvent {
  id: number;
  batchId: string | null;
  modelName: "save" | "tag" | "tag_group" | "tag_group_member" | "settings";
  modelId: string;
  action: "I" | "U" | "D" | "A";
  data: unknown;
  prevData: unknown;
  actor: "user" | "system";
  actorReason: string | null;
  createdAt: string;
}

export function applyAction(event: SyncActionEvent): void {
  if (event.modelName !== "save") return;

  if (event.action === "I") {
    const save = normalise(event.data as Partial<Save>);
    if (save) upsertSave(save);
    return;
  }

  if (event.action === "U") {
    const patch = event.data as Partial<Save>;
    const existing = pool.get(event.modelId);
    if (!existing) {
      const created = normalise(patch);
      if (created) upsertSave(created);
      return;
    }
    const merged = normalise({
      ...existing,
      ...patch,
      id: existing.id,
    });
    if (merged) upsertSave(merged);
    return;
  }

  if (event.action === "D") {
    deleteSave(event.modelId);
    return;
  }

  if (event.action === "A") {
    const existing = pool.get(event.modelId);
    if (!existing) return;
    const patched = event.data as Partial<Save>;
    const merged = normalise({ ...existing, ...patched });
    if (merged) upsertSave(merged);
  }
}

export function normalise(raw: Partial<Save> | null | undefined): Save | null {
  if (!raw?.id) return null;
  return {
    id: raw.id,
    source: raw.source ?? "twitter",
    sourceId: raw.sourceId ?? "",
    url: raw.url ?? "",
    title: raw.title ?? null,
    description: raw.description ?? null,
    author: raw.author ?? null,
    notes: raw.notes ?? null,
    mediaUrl: raw.mediaUrl ?? null,
    mediaType: raw.mediaType ?? null,
    files: raw.files ?? [],
    coverIndex: raw.coverIndex,
    width: raw.width ?? null,
    height: raw.height ?? null,
    fileSize: raw.fileSize ?? null,
    phash: raw.phash ?? null,
    sensitivity: raw.sensitivity ?? null,
    sensitivityModel: raw.sensitivityModel ?? null,
    videoNotes: raw.videoNotes ?? [],
    dominantColors: raw.dominantColors ?? [],
    tags: raw.tags ?? [],
    rawJson: raw.rawJson ?? undefined,
    status: raw.status,
    ingestStartedAt: toMs(raw.ingestStartedAt) ?? null,
    ingestCompletedAt: toMs(raw.ingestCompletedAt) ?? null,
    tasks: raw.tasks,
    savedAt: toMs(raw.savedAt) ?? Date.now(),
    createdAt: toMs(raw.createdAt) ?? Date.now(),
    deletedAt: toMs(raw.deletedAt),
  };
}

function toMs(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (v instanceof Date) {
    const t = v.getTime();
    return Number.isFinite(t) ? t : null;
  }
  if (typeof v === "string") {
    const asNum = Number(v);
    if (!Number.isNaN(asNum) && v.trim() !== "" && Number.isFinite(asNum)) {
      return asNum;
    }
    const parsed = Date.parse(v);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
