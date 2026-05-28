import { FIELD_META } from "@pond/schema/filters/meta";
import {
  COMPARATORS_BY_TYPE,
  type ComparatorId,
  type Predicate,
} from "@pond/schema/filters/types";
import { Menu } from "@pond/ui";
import { ChevronsUpDown } from "lucide-react";
import { useView } from "../context";
import styles from "./comparator-select.module.css";
import { COMPARATOR_LABELS } from "./search-index";

interface ComparatorSelectProps {
  index: number;
  predicate: Predicate;
}

export function ComparatorSelect({ index, predicate }: ComparatorSelectProps) {
  const { actions } = useView();
  const meta = FIELD_META[predicate.field];
  const allowed = COMPARATORS_BY_TYPE[meta.type];

  return (
    <Menu.SubmenuRoot>
      <Menu.SubmenuTrigger
        render={
          <button
            type="button"
            className={styles.trigger}
            aria-label="Comparator"
          >
            <span className={styles.label}>
              {COMPARATOR_LABELS[predicate.cmp]}
            </span>
            <ChevronsUpDown width="12" height="12" />
          </button>
        }
      />
      <Menu.Portal>
        <Menu.Positioner side="left" align="start" sideOffset={4}>
          <Menu.Popup className={styles.popup}>
            <Menu.RadioGroup
              value={predicate.cmp}
              onValueChange={(next) => {
                actions.updatePredicate(index, {
                  ...predicate,
                  cmp: next as ComparatorId,
                });
              }}
            >
              {allowed.map((id) => (
                <Menu.RadioItem key={id} value={id}>
                  <Menu.ItemLabel>{COMPARATOR_LABELS[id]}</Menu.ItemLabel>
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.SubmenuRoot>
  );
}
