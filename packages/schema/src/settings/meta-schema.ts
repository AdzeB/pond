import { z } from "zod";
import type { PrefsManifest, SectionsManifest } from "./types";

// Runtime validation of the manifests themselves, run by the generator.
// `satisfies` already checks shape at compile time; this adds cross-file
// checks (slice/key existence, options presence, numeric bounds).

const FieldTypeSchema = z.union([
  z.literal("boolean"),
  z.literal("number"),
  z.literal("string"),
  z.object({ enum: z.array(z.union([z.string(), z.number()])).min(1) }),
  z.object({ ts: z.string().min(1), import: z.string().min(1).optional() }),
]);

const PrefsFieldSchema = z.object({
  type: FieldTypeSchema,
  nullable: z.boolean().optional(),
  default: z.unknown(),
  min: z.number().optional(),
  max: z.number().optional(),
});

const SlicePrefsSchema = z.union([
  z.object({
    kind: z.literal("fields"),
    fields: z.record(z.string(), PrefsFieldSchema),
  }),
  z.object({
    kind: z.literal("ref"),
    ts: z.string().min(1),
    import: z.string().min(1).optional(),
    default: z.unknown(),
  }),
]);

const PrefsManifestSchema = z.record(z.string(), SlicePrefsSchema);

const OptionSchema = z.object({
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
  label: z.string(),
});

const FieldRowSchema = z.object({
  control: z.enum(["switch", "select", "range", "stepper", "number", "color"]),
  key: z.string().min(1),
  title: z.string().optional(),
  description: z.string().optional(),
  options: z.array(OptionSchema).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  suffix: z.string().optional(),
  unit: z.string().optional(),
  fallback: z.number().optional(),
  placeholder: z.string().optional(),
  visible: z.string().optional(),
  disabled: z.string().optional(),
  apply: z.string().optional(),
});

const CustomRowSchema = z.object({
  control: z.literal("custom"),
  key: z.string().min(1),
  component: z.string().min(1),
  visible: z.string().optional(),
});

const RowSchema = z.union([CustomRowSchema, FieldRowSchema]);

const GroupSchema = z.object({
  title: z.string().optional(),
  slice: z.string().optional(),
  binding: z.string().optional(),
  visible: z.string().optional(),
  items: z.array(RowSchema).optional(),
  body: z.string().optional(),
});

const SectionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  group: z.enum(["app", "library", "saving", "dev"]),
  icon: z.string().min(1),
  description: z.string().optional(),
  slice: z.string().optional(),
  groups: z.array(GroupSchema).optional(),
  custom: z.string().optional(),
});

const SectionsManifestSchema = z.array(SectionSchema);

const FIELD_CONTROLS = new Set([
  "switch",
  "select",
  "range",
  "stepper",
  "number",
  "color",
]);

export function validateManifests(
  prefs: PrefsManifest,
  sections: SectionsManifest,
): void {
  PrefsManifestSchema.parse(prefs);
  SectionsManifestSchema.parse(sections);

  const sliceKeys = (slice: string): Set<string> => {
    const spec = prefs[slice];
    if (!spec || spec.kind !== "fields") return new Set();
    return new Set(Object.keys(spec.fields));
  };

  for (const section of sections) {
    if (section.custom) {
      if (section.groups) {
        throw new Error(`section "${section.id}" sets both custom and groups`);
      }
      continue;
    }
    if (section.slice && !prefs[section.slice]) {
      throw new Error(
        `section "${section.id}" references unknown slice "${section.slice}"`,
      );
    }
    for (const group of section.groups ?? []) {
      if (group.slice && !prefs[group.slice]) {
        throw new Error(
          `group "${group.title ?? "?"}" in "${section.id}" references unknown slice "${group.slice}"`,
        );
      }
      // Groups backed by a custom binding own their own data; skip key checks.
      const boundSlice = group.binding
        ? null
        : (group.slice ?? section.slice ?? null);
      for (const row of group.items ?? []) {
        if (!FIELD_CONTROLS.has(row.control)) continue;
        if (row.control === "select" && !("options" in row && row.options)) {
          throw new Error(
            `select "${row.key}" in "${section.id}" is missing options`,
          );
        }
        if (
          (row.control === "range" ||
            row.control === "stepper" ||
            row.control === "number") &&
          ("min" in row ? row.min === undefined : true)
        ) {
          throw new Error(
            `${row.control} "${row.key}" in "${section.id}" is missing min/max`,
          );
        }
        if (boundSlice) {
          const keys = sliceKeys(boundSlice);
          if (keys.size > 0 && !keys.has(row.key)) {
            throw new Error(
              `row "${row.key}" in "${section.id}" is not a field of slice "${boundSlice}"`,
            );
          }
        }
      }
    }
  }
}
