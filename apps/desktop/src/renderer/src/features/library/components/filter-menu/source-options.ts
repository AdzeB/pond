import { getSourceDefForIdentity } from "@/features/sources";
import type { FilterOption } from "./options";

export function sourceOptions(values: readonly string[]): FilterOption[] {
  return values.map((value) => {
    const source = getSourceDefForIdentity(value);
    return {
      label:
        source?.source === "local" ? "Local Files" : (source?.label ?? value),
      predicate: { field: "source", operator: "eq", value },
    };
  });
}
