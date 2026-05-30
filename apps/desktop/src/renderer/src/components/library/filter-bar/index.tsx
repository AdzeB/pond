import { FIELD_IDS, FIELD_META } from "@pond/schema/filters/meta";
import type { FieldId, Predicate } from "@pond/schema/filters/types";
import { Menu } from "@pond/ui";
import { X } from "lucide-react";
import { memo, useMemo } from "react";
import { useView } from "@/components/library/view-menu";
import {
  defaultPredicateFor,
  predicateIsActive,
} from "@/components/library/view-menu/filter/helpers";
import { FIELD_ICONS } from "@/components/library/view-menu/filter/search-index";
import {
  Body,
  summariseValue,
} from "@/components/library/view-menu/filter/value-select";
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

interface FilterFieldProps {
  field: FieldId;
  predicate: Predicate | null;
  onChange: (field: FieldId, next: Predicate | null) => void;
}

// Memoized so unrelated view-state changes (zoom, sort, …) don't re-render every chip.
const FilterField = memo(function FilterField({
  field,
  predicate,
  onChange,
}: FilterFieldProps) {
  const meta = FIELD_META[field];
  const Icon = FIELD_ICONS[field];
  const active = predicate != null && predicateIsActive(predicate);
  const draft = predicate ?? defaultPredicateFor(field);

  return (
    <div className={styles.chip} data-active={active ? "true" : undefined}>
      <Menu.Root>
        <Menu.Trigger className={styles.trigger}>
          <span className={styles.icon} aria-hidden>
            <Icon width="1em" height="1em" />
          </span>
          <span className={styles.label}>{meta.label}</span>
          {active && predicate ? (
            <span className={styles.value}>{summariseValue(predicate)}</span>
          ) : null}
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner side="bottom" align="start" sideOffset={6}>
            <Menu.Popup>
              <Body
                predicate={draft}
                onChange={(next) => onChange(field, next)}
              />
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      {active ? (
        <button
          type="button"
          className={styles.clear}
          aria-label={`Clear ${meta.label} filter`}
          onClick={() => onChange(field, null)}
        >
          <X width="0.85em" height="0.85em" />
        </button>
      ) : null}
    </div>
  );
});
