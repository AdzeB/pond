import { sql } from "drizzle-orm";
import { saves } from "../../db";
import { defineField } from "./descriptor";
import { toMillis } from "./shared";

export const cameraMake = defineField({
  id: "cameraMake",
  type: "string",
  label: "Camera Make",
  group: "media",
  project: (save) => (save.cameraMake ?? "").toLowerCase(),
  sqlProjection: () => sql`lower(${saves.cameraMake})`,
});

export const cameraModel = defineField({
  id: "cameraModel",
  type: "string",
  label: "Camera Model",
  group: "media",
  project: (save) => (save.cameraModel ?? "").toLowerCase(),
  sqlProjection: () => sql`lower(${saves.cameraModel})`,
});

export const lensModel = defineField({
  id: "lensModel",
  type: "string",
  label: "Lens",
  group: "media",
  project: (save) => (save.lensModel ?? "").toLowerCase(),
  sqlProjection: () => sql`lower(${saves.lensModel})`,
});

export const focalLength = defineField({
  id: "focalLength",
  type: "number",
  label: "Focal Length",
  group: "media",
  project: (save) => save.focalLength ?? null,
  sqlProjection: () => sql`${saves.focalLength}`,
});

export const aperture = defineField({
  id: "aperture",
  type: "number",
  label: "Aperture",
  group: "media",
  project: (save) => save.aperture ?? null,
  sqlProjection: () => sql`${saves.aperture}`,
});

export const iso = defineField({
  id: "iso",
  type: "number",
  label: "ISO",
  group: "media",
  project: (save) => save.iso ?? null,
  sqlProjection: () => sql`${saves.iso}`,
});

export const takenAt = defineField({
  id: "takenAt",
  type: "date",
  label: "Date Taken",
  group: "time",
  project: (save) => toMillis(save.takenAt),
  sqlProjection: () => sql`${saves.takenAt}`,
});
