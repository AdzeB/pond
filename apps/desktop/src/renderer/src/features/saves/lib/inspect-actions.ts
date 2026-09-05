import type { ImageCrop } from "@pond/schema/db";
import { mutateSave, type SaveEdit } from "@/features/saves/lib/mutate";
import type { Save } from "@/features/saves/types";

export function rotatePatch(save: Save, delta: number): SaveEdit {
  return { rotate: ((((save.rotate ?? 0) + delta) % 360) + 360) % 360 };
}

export function flipPatch(save: Save, axis: "x" | "y"): SaveEdit {
  return axis === "x" ? { flipX: !save.flipX } : { flipY: !save.flipY };
}

export function resetTransformPatch(): SaveEdit {
  return { rotate: 0, flipX: false, flipY: false, crop: null };
}

export function cropPatch(crop: ImageCrop): SaveEdit {
  return { crop };
}

export async function applyInspect(
  id: string,
  patch: SaveEdit,
  reason: string,
): Promise<void> {
  await mutateSave(id, patch, { actorReason: reason });
}

function orderedVisibleSaveIds(): string[] {
  return [
    ...new Set(
      [...document.querySelectorAll("[data-save-id]")]
        .map((el) => el.getAttribute("data-save-id"))
        .filter((id): id is string => Boolean(id)),
    ),
  ];
}

export function adjacentVisibleSaveId(
  current: string,
  delta: number,
): string | null {
  const ids = orderedVisibleSaveIds();
  if (ids.length === 0) return null;
  const idx = ids.indexOf(current);
  if (idx < 0) return ids[0] ?? null;
  const next = idx + delta;
  if (next < 0 || next >= ids.length) return ids[idx] ?? null;
  return ids[next] ?? null;
}

export function clampCrop(crop: ImageCrop): ImageCrop {
  const x = Math.min(0.95, Math.max(0, crop.x));
  const y = Math.min(0.95, Math.max(0, crop.y));
  const w = Math.min(1 - x, Math.max(0.05, crop.w));
  const h = Math.min(1 - y, Math.max(0.05, crop.h));
  return { x, y, w, h };
}
