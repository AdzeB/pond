import { FIELD_META } from "@pond/schema/filters/meta";
import type { Predicate } from "@pond/schema/filters/types";
import { describePredicate } from "@/lib/search/fields";
import type { FilterOption } from "./options";
import { isFilterSelected } from "./selection";

export function filterSummary(
  rules: readonly Predicate[],
  options: readonly FilterOption[],
): string {
  return rules
    .map((rule) => {
      if (rule.negate)
        return `Not ${filterSummary([{ ...rule, negate: false }], options)}`;
      const exact = options.find(
        (option) =>
          rule.operator === option.predicate.operator &&
          JSON.stringify(rule.value) === JSON.stringify(option.predicate.value),
      );
      if (exact) return exact.label;
      if (rule.field === "duration") {
        const duration = (value: unknown) => {
          const seconds = Number(value);
          return seconds !== 0 && seconds % 3600 === 0
            ? `${seconds / 3600}h`
            : seconds !== 0 && seconds % 60 === 0
              ? `${seconds / 60}min`
              : `${seconds}s`;
        };
        if (rule.operator === "between" && Array.isArray(rule.value))
          return `${duration(rule.value[0])}–${duration(rule.value[1])}`;
        const symbols: Record<string, string> = {
          gte: "≥ ",
          gt: "> ",
          lte: "≤ ",
          lt: "< ",
          neq: "≠ ",
        };
        return `${symbols[rule.operator] ?? ""}${duration(rule.value)}`;
      }
      if (rule.operator === "empty")
        return rule.field === "tags"
          ? "Untagged"
          : rule.field === "folder"
            ? "No Folder"
            : "No List";
      if (["enum", "stringArray"].includes(FIELD_META[rule.field].type)) {
        const values = Array.isArray(rule.value) ? rule.value : [rule.value];
        const label = values
          .map((value) => {
            const candidate = { ...rule, operator: "eq" as const, value };
            return (
              options.find((option) =>
                isFilterSelected([candidate], option.predicate),
              )?.label ?? String(value)
            );
          })
          .join(", ");
        return ["neq", "nin", "none"].includes(rule.operator)
          ? `Not ${label}`
          : rule.operator === "every"
            ? `All: ${label}`
            : label;
      }
      const description = describePredicate(rule);
      return description.label;
    })
    .join(" · ");
}
