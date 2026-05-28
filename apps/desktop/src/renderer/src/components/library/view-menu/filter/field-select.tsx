import { FIELD_META } from "@pond/schema/filters/meta";
import type { FieldId, Predicate } from "@pond/schema/filters/types";
import { Input, Menu } from "@pond/ui";
import { useMemo, useState } from "react";
import { useSaves } from "@/pool/hooks";
import { useView } from "../context";
import styles from "./field-select.module.css";
import { defaultPredicateFor } from "./helpers";
import { searchEntries } from "./score";
import {
  buildSearchIndex,
  FIELD_GROUPS,
  FIELD_ICONS,
  fieldsByGroup,
  type SearchEntry,
} from "./search-index";

interface FieldSelectProps {
  index: number;
  predicate: Predicate;
}

export function FieldSelect({ index, predicate }: FieldSelectProps) {
  const { actions } = useView();
  const meta = FIELD_META[predicate.field];
  const Icon = FIELD_ICONS[predicate.field];
  const [query, setQuery] = useState("");

  const saves = useSaves();
  const groups = useMemo(() => fieldsByGroup(), []);
  const searchIndex = useMemo(() => buildSearchIndex(saves), [saves]);

  const results = useMemo<SearchEntry[]>(() => {
    if (!query.trim()) return [];
    return searchEntries(searchIndex, query, new Map()).slice(0, 50);
  }, [query, searchIndex]);

  function pick(field: FieldId) {
    const next = defaultPredicateFor(field);
    actions.updatePredicate(index, next);
    setQuery("");
  }

  return (
    <Menu.SubmenuRoot>
      <Menu.SubmenuTrigger
        render={
          <button
            type="button"
            className={styles.trigger}
            aria-label={`Field: ${meta.label}`}
          >
            <span className={styles["trigger-icon"]} aria-hidden>
              <Icon width="1em" height="1em" />
            </span>
            <span className={styles["trigger-label"]}>{meta.label}</span>
          </button>
        }
      />
      <Menu.Portal>
        <Menu.Positioner side="left" align="start" sideOffset={4}>
          <Menu.Popup className={styles.popup}>
            <div className={styles.search}>
              <Input.Field
                type="search"
                value={query}
                placeholder="Find a field…"
                autoFocus
                spellCheck={false}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            {query.trim() ? (
              results.length === 0 ? (
                <div className={styles.empty}>No matches.</div>
              ) : (
                results.map((entry) => (
                  <ResultItem
                    key={resultKey(entry)}
                    entry={entry}
                    onPick={pick}
                  />
                ))
              )
            ) : (
              FIELD_GROUPS.map((group) =>
                groups[group.id].length > 0 ? (
                  <div key={group.id} className={styles.group}>
                    <div className={styles["group-label"]}>{group.label}</div>
                    {groups[group.id].map((field) => (
                      <FieldItem key={field} field={field} onPick={pick} />
                    ))}
                  </div>
                ) : null,
              )
            )}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.SubmenuRoot>
  );
}

function FieldItem({
  field,
  onPick,
}: {
  field: FieldId;
  onPick: (f: FieldId) => void;
}) {
  const meta = FIELD_META[field];
  const Icon = FIELD_ICONS[field];
  return (
    <button type="button" className={styles.item} onClick={() => onPick(field)}>
      <span className={styles["item-icon"]} aria-hidden>
        <Icon width="1em" height="1em" />
      </span>
      <span className={styles["item-label"]}>{meta.label}</span>
    </button>
  );
}

function ResultItem({
  entry,
  onPick,
}: {
  entry: SearchEntry;
  onPick: (f: FieldId) => void;
}) {
  if (entry.kind === "field" || entry.kind === "field-in-group") {
    return <FieldItem field={entry.field} onPick={onPick} />;
  }
  return null;
}

function resultKey(entry: SearchEntry): string {
  switch (entry.kind) {
    case "field":
      return `field:${entry.field}`;
    case "field-in-group":
      return `field-in-group:${entry.group.id}:${entry.field}`;
    case "group":
      return `group:${entry.group.id}`;
    case "value":
      return `value:${entry.label}`;
  }
}
