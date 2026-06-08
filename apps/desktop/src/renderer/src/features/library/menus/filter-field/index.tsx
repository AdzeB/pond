import { IconXmarkOutline12 as X } from "@pond/icons/outline/12";
import { FIELD_META } from "@pond/schema/filters/meta";
import type { FieldId, Predicate } from "@pond/schema/filters/types";
import { Menu } from "@pond/ui";
import { memo } from "react";
import { defaultPredicateFor } from "@/features/library/menus/view/filter/helpers";
import {
  changeComparator,
  operatorOptions,
  operatorPhrase,
} from "@/features/library/menus/view/filter/operators";
import {
  Body,
  summariseValue,
} from "@/features/library/menus/view/filter/value-select";
import styles from "./styles.module.css";

const VALUELESS = new Set<Predicate["operator"]>(["empty"]);

interface FilterChipProps {
  field: FieldId;
  predicate: Predicate | null;
  onChange: (field: FieldId, next: Predicate | null) => void;
  autoOpenValue?: boolean;
}

export const FilterChip = memo(function FilterChip({
  field,
  predicate,
  onChange,
  autoOpenValue,
}: FilterChipProps) {
  const meta = FIELD_META[field];
  const draft = predicate ?? defaultPredicateFor(field);
  const opOptions = operatorOptions(draft);
  const summary = summariseValue(draft);
  const valueEmpty = summary === "Select";
  const valueless = VALUELESS.has(draft.operator);

  return (
    <div className={styles.chip}>
      <span className={styles.field}>
        <span className={styles.label}>{meta.label}</span>
      </span>

      {opOptions.length > 0 ? (
        <Menu.Root>
          <Menu.Trigger
            render={
              <button
                type="button"
                className={styles.segment}
                aria-label={`${meta.label} operator`}
              >
                {operatorPhrase(draft)}
              </button>
            }
          />
          <Menu.Portal>
            <Menu.Positioner side="bottom" align="start" sideOffset={6}>
              <Menu.Popup>
                {opOptions.map((option) => (
                  <Menu.Item
                    key={option.operator}
                    data-active={
                      option.operator === draft.operator ? "true" : undefined
                    }
                    onClick={() =>
                      onChange(field, changeComparator(draft, option.operator))
                    }
                  >
                    <Menu.ItemLabel>{option.label}</Menu.ItemLabel>
                  </Menu.Item>
                ))}
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      ) : (
        <span className={styles.segment} data-static="true">
          {operatorPhrase(draft)}
        </span>
      )}

      {valueless ? null : (
        <Menu.Root defaultOpen={autoOpenValue}>
          <Menu.Trigger
            render={
              <button
                type="button"
                className={styles.segment}
                data-value="true"
                data-empty={valueEmpty ? "true" : undefined}
                aria-label={`${meta.label} value`}
              >
                {summary}
              </button>
            }
          />
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
      )}

      <button
        type="button"
        className={styles.remove}
        aria-label={`Remove ${meta.label} filter`}
        onClick={() => onChange(field, null)}
      >
        <X width="0.85em" height="0.85em" />
      </button>
    </div>
  );
});
