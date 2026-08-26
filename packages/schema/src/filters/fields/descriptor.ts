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
  project(save: SaveLike): unknown;
  sqlProjection?: () => SQL | null;
}

type FieldDescriptorInput = Omit<FieldDescriptor, "comparators"> & {
  comparators?: readonly ComparatorId[];
};

export function defineField(input: FieldDescriptorInput): FieldDescriptor {
  return {
    ...input,
    comparators: input.comparators ?? COMPARATORS_BY_TYPE[input.type],
  };
}
