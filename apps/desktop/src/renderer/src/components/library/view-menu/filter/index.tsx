import type { Predicate } from "@pond/schema/filters/types";
import { Tooltip } from "@pond/ui";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useView } from "../context";
import { ComparatorSelect } from "./comparator-select";
import { FieldSelect } from "./field-select";
import styles from "./styles.module.css";
import { ValueSelect } from "./value-select";

function Root() {
  return (
    <div className={styles.root}>
      <Header />
      <RowList />
      <Add />
    </div>
  );
}

function Header() {
  const { state, actions } = useView();
  const total = state.query.clauses.length + state.pendingPredicates.length;
  if (total === 0) return null;
  return (
    <div className={styles.header}>
      <button
        type="button"
        className={styles["header-reset"]}
        onClick={() => actions.resetFilters()}
      >
        Reset
      </button>
    </div>
  );
}

function RowList() {
  const { state } = useView();
  const committed: Predicate[] = [];
  for (const clause of state.query.clauses) {
    if (clause.kind === "p") committed.push(clause);
  }
  const rows = [...committed, ...state.pendingPredicates];
  if (rows.length === 0) {
    return <Empty />;
  }
  return (
    <div className={styles["row-list"]}>
      {rows.map((predicate, idx) => (
        // The combined list is ordered; position IS the row's identity.
        // biome-ignore lint/suspicious/noArrayIndexKey: row identity is its slot
        <Row key={idx} index={idx} predicate={predicate} />
      ))}
    </div>
  );
}

interface RowProps {
  index: number;
  predicate: Predicate;
}

function Row({ index, predicate }: RowProps) {
  return (
    <div className={styles.row}>
      <Connector index={index} />
      <FieldSelect index={index} predicate={predicate} />
      <ComparatorSelect index={index} predicate={predicate} />
      <ValueSelect index={index} predicate={predicate} />
      <Delete index={index} />
      <Reorder index={index} />
    </div>
  );
}

function Connector({ index }: { index: number }) {
  return (
    <span className={styles.connector} data-index={index}>
      {index === 0 ? "Where" : "And"}
    </span>
  );
}

function Delete({ index }: { index: number }) {
  const { actions } = useView();
  return (
    <button
      type="button"
      className={styles["icon-btn"]}
      aria-label="Remove filter"
      onClick={() => actions.updatePredicate(index, null)}
    >
      <Trash2 width="14" height="14" />
    </button>
  );
}

function Reorder({ index }: { index: number }) {
  return (
    <Tooltip label="Drag to reorder (coming soon)" side="bottom">
      <button
        type="button"
        className={styles["icon-btn"]}
        aria-label="Reorder"
        data-index={index}
        disabled
      >
        <GripVertical width="14" height="14" />
      </button>
    </Tooltip>
  );
}

function Add() {
  const { actions } = useView();
  return (
    <button
      type="button"
      className={styles.add}
      onClick={() => actions.addPredicate()}
    >
      <Plus width="14" height="14" />
      <span>Add a condition</span>
    </button>
  );
}

function Empty() {
  return (
    <div className={styles.empty}>
      No filters yet. Add a condition to start.
    </div>
  );
}

export const Filter = {
  Root,
  Header,
  RowList,
  Row,
  Connector,
  FieldSelect,
  ComparatorSelect,
  ValueSelect,
  Delete,
  Reorder,
  Add,
  Empty,
};
