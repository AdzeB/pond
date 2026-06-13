import type { SQL } from "drizzle-orm";
import {
  COMPARATORS_BY_TYPE,
  type ComparatorId,
  type FieldId,
  type FieldTypeId,
} from "../types";
import type { SaveLike } from "./save-like";

export type FieldGroup = "content" | "media" | "time" | "people";

export interface FieldPreset {
  id: string;
  label: string;
  value: unknown;
}

export interface FieldDescriptor {
  id: FieldId;
  type: FieldTypeId;
  label: string;
  group: FieldGroup;
  presets?: ReadonlyArray<FieldPreset>;
  comparators: readonly ComparatorId[];
  // In-memory projection used by match.ts.
  project(save: SaveLike): unknown;
  // SQL projection for to-sql.ts; absent => in-memory only, no WHERE clause.
  sqlProjection?: () => SQL | null;
}

type FieldDescriptorInput = Omit<FieldDescriptor, "comparators"> & {
  comparators?: readonly ComparatorId[];
};

// Comparators default to the field type's allowed set unless overridden.
export function defineField(input: FieldDescriptorInput): FieldDescriptor {
  return {
    ...input,
    comparators: input.comparators ?? COMPARATORS_BY_TYPE[input.type],
  };
}
