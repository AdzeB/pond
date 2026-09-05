import { FIELD_META } from "@pond/schema/filters/meta";
import type { FieldId, Predicate } from "@pond/schema/filters/types";
import { Menu } from "@pond/ui";
import { useState } from "react";
import { useScrollFade } from "@/shared/hooks/use-scroll-fade";
import { choiceIsSearchable } from "../layout";
import type { FilterOption } from "../options";
import { isChoiceSelected } from "../selection";
import { emptyChoiceLabel } from "../summary";
import { useChoiceCounts } from "../use-choice-counts";
import styles from "./choice.module.css";
import { EmptyChoice } from "./empty";
import { ChoiceOption } from "./option";

export function ChoiceFilter({
  field,
  options,
  matching = "any",
  rows,
  onChange,
}: {
  field: FieldId;
  options: FilterOption[];
  matching?: "any" | "all";
  rows: Predicate[];
  onChange: (rows: Predicate[]) => void;
}) {
  const [search, setSearch] = useState("");
  const scrollFade = useScrollFade<HTMLDivElement>();
  const meta = FIELD_META[field];
  const { counts, empty } = useChoiceCounts(field);
  const searchable = choiceIsSearchable(field, options.length);
  const emptyLabel = emptyChoiceLabel(field);
  const showEmpty =
    meta.type === "stringArray" &&
    emptyLabel.toLowerCase().includes(search.trim().toLowerCase());
  const allOptions = [...options];
  if (field === "format") {
    for (const value of counts.keys()) {
      allOptions.push({
        label: value.toUpperCase(),
        predicate: { field, operator: "some", value: [value] },
      });
    }
  }
  for (const row of rows.filter(
    (row) =>
      row.field === field &&
      ["eq", "neq", "in", "nin", "some", "every", "none"].includes(
        row.operator,
      ),
  )) {
    for (const value of Array.isArray(row.value) ? row.value : [row.value]) {
      if (
        allOptions.some((option) =>
          isChoiceSelected(
            [{ field, operator: "eq", value }],
            option.predicate,
            "any",
          ),
        )
      )
        continue;
      allOptions.push({
        label: String(value),
        predicate: {
          field,
          operator: meta.type === "stringArray" ? "some" : "eq",
          value: meta.type === "stringArray" ? [value] : value,
        },
      });
    }
  }
  const visible = allOptions.filter((option) =>
    option.label.toLowerCase().includes(search.trim().toLowerCase()),
  );
  return (
    <>
      {searchable ? (
        <div className={styles.header}>
          <div className={styles.search}>
            <Menu.Input
              aria-label={`Filter ${meta.label}`}
              placeholder={`Search ${meta.label.toLowerCase()}…`}
              value={search}
              onValueChange={setSearch}
            />
          </div>
        </div>
      ) : null}
      <div className={styles.options} {...scrollFade}>
        {showEmpty ? (
          <EmptyChoice
            field={field}
            label={emptyLabel}
            count={empty}
            rows={rows}
            onChange={onChange}
          />
        ) : null}
        {visible.map((option) => {
          const raw = Array.isArray(option.predicate.value)
            ? option.predicate.value[0]
            : option.predicate.value;
          return (
            <ChoiceOption
              key={String(raw)}
              option={option}
              rows={rows}
              matching={matching}
              count={counts.get(String(raw).toLowerCase()) ?? 0}
              onChange={onChange}
            />
          );
        })}
        {!visible.length && !showEmpty ? (
          <Menu.Item disabled>
            <Menu.ItemLabel>
              {search ? "No matches" : "None available"}
            </Menu.ItemLabel>
          </Menu.Item>
        ) : null}
      </div>
    </>
  );
}
