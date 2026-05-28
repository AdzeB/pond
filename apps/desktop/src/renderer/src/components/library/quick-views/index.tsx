import { SOURCES } from "@pond/schema/db";
import type { Predicate, Query } from "@pond/schema/filters/types";
import { useMemo } from "react";
import { useView } from "@/components/library/view-menu";
import styles from "./styles.module.css";

type SourceId = (typeof SOURCES)[number];

const SOURCE_LABELS: Record<SourceId, string> = {
  twitter: "X / Twitter",
  instagram: "Instagram",
  pinterest: "Pinterest",
  arena: "Are.na",
  cosmos: "Cosmos",
  tiktok: "TikTok",
  youtube: "YouTube",
};

const SOURCE_CHIPS: Array<{ id: SourceId; label: string }> = SOURCES.map(
  (id) => ({ id, label: SOURCE_LABELS[id] }),
);

function isSourceEq(p: Predicate, id: SourceId): boolean {
  return (
    p.field === "source" &&
    p.cmp === "eq" &&
    !p.negate &&
    typeof p.value === "string" &&
    p.value === id
  );
}

function isSourcePredicate(p: Predicate): boolean {
  return p.field === "source";
}

function withoutSourceClause(q: Query): Query {
  return {
    kind: "and",
    clauses: q.clauses.filter((c) => !(c.kind === "p" && isSourcePredicate(c))),
  };
}

function makeSourceClause(id: SourceId): Predicate {
  return { kind: "p", field: "source", cmp: "eq", value: id };
}

export function QuickViews() {
  const { state, actions } = useView();

  const active = useMemo<SourceId | "all">(() => {
    const sourcePreds = state.query.clauses.filter(
      (c): c is Predicate => c.kind === "p" && isSourcePredicate(c),
    );
    if (sourcePreds.length !== 1) return "all";
    const only = sourcePreds[0];
    if (!only) return "all";
    const match = SOURCES.find((id) => isSourceEq(only, id));
    return match ?? "all";
  }, [state.query.clauses]);

  function selectAll() {
    actions.setQuery(withoutSourceClause(state.query));
  }

  function selectSource(id: SourceId) {
    const cleared = withoutSourceClause(state.query);
    actions.setQuery({
      kind: "and",
      clauses: [...cleared.clauses, makeSourceClause(id)],
    });
  }

  return (
    <nav className={styles.root} aria-label="Quick views">
      <button
        type="button"
        className={styles.chip}
        data-active={active === "all" ? "true" : undefined}
        onClick={selectAll}
      >
        <span className={styles["chip-label"]}>All</span>
      </button>
      {SOURCE_CHIPS.map((chip) => (
        <button
          key={chip.id}
          type="button"
          className={styles.chip}
          data-active={active === chip.id ? "true" : undefined}
          onClick={() => selectSource(chip.id)}
        >
          <span className={styles["chip-label"]}>{chip.label}</span>
        </button>
      ))}
    </nav>
  );
}
