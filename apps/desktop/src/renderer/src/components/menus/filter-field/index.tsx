import { IconXmarkOutline18 as X } from "@pond/icons/outline/18";
import { FIELD_META } from "@pond/schema/filters/meta";
import type { FieldId, Predicate } from "@pond/schema/filters/types";
import { Menu } from "@pond/ui";
import { memo } from "react";
import { FIELD_UI } from "@/components/menus/view/filter/field-ui";
import {
  defaultPredicateFor,
  predicateIsActive,
} from "@/components/menus/view/filter/helpers";
import {
  Body,
  summariseValue,
} from "@/components/menus/view/filter/value-select";
import styles from "./styles.module.css";

interface FilterFieldProps {
  field: FieldId;
  predicate: Predicate | null;
  onChange: (field: FieldId, next: Predicate | null) => void;
}

// Memoized so unrelated view-state changes (zoom, sort, …) don't re-render every chip.
export const FilterField = memo(function FilterField({
  field,
  predicate,
  onChange,
}: FilterFieldProps) {
  const meta = FIELD_META[field];
  const Icon = FIELD_UI[field].icon;
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
