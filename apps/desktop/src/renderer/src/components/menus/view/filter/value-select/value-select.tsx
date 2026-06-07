import { FIELD_META } from "@pond/schema/filters/meta";
import type { Predicate } from "@pond/schema/filters/types";
import { Menu } from "@pond/ui";
import { useCallback } from "react";
import { useView } from "../../context";
import { Body } from "./body";
import styles from "./styles.module.css";
import { summariseValue } from "./summarise";

interface ValueSelectProps {
  index: number;
  predicate: Predicate;
}

export function ValueSelect({ index, predicate }: ValueSelectProps) {
  const { actions } = useView();
  const meta = FIELD_META[predicate.field];
  const summary = summariseValue(predicate);
  const isEmpty = summary === "Select";

  const onChange = useCallback(
    (next: Predicate) => actions.updatePredicate(index, next),
    [actions, index],
  );

  return (
    <Menu.SubmenuRoot>
      <Menu.SubmenuTrigger
        render={
          <button
            type="button"
            className={styles["popover-trigger"]}
            aria-label={`${meta.label} value`}
            data-empty={isEmpty ? "true" : undefined}
          >
            {summary}
          </button>
        }
      />
      <Menu.Portal>
        <Menu.Positioner side="left" align="start" sideOffset={4}>
          <Menu.Popup>
            <Body predicate={predicate} onChange={onChange} />
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.SubmenuRoot>
  );
}
