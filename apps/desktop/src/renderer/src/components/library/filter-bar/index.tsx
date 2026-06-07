import { FIELD_IDS } from "@pond/schema/filters/meta";
import type { FieldId, Predicate } from "@pond/schema/filters/types";
import { useMemo } from "react";
import { FilterField } from "@/components/menus/filter-field";
import { useView } from "@/components/menus/view";
import styles from "./styles.module.css";

const FILTER_FIELDS: readonly FieldId[] = FIELD_IDS;

export function FilterBar() {
  const { state, actions } = useView();
  const { setFieldPredicate, resetFilters } = actions;

  const byField = useMemo(() => {
    const map = new Map<FieldId, Predicate>();
    for (const clause of state.query.clauses) {
      if (clause.kind === "p" && !map.has(clause.field)) {
        map.set(clause.field, clause);
      }
    }
    for (const pending of state.pendingPredicates) {
      if (!map.has(pending.field)) map.set(pending.field, pending);
    }
    return map;
  }, [state.query.clauses, state.pendingPredicates]);

  const anyActive = state.query.clauses.some((c) => c.kind === "p");

  return (
    // biome-ignore lint/a11y/useSemanticElements: a fieldset's default form semantics and layout don't fit this filter toolbar
    <div className={styles.bar} role="group" aria-label="Filters">
      {FILTER_FIELDS.map((field) => (
        <FilterField
          key={field}
          field={field}
          predicate={byField.get(field) ?? null}
          onChange={setFieldPredicate}
        />
      ))}
      {anyActive ? (
        <button
          type="button"
          className={styles.reset}
          onClick={() => resetFilters()}
        >
          Reset
        </button>
      ) : null}
    </div>
  );
}
