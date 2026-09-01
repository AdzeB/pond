import { FIELD_META } from "@pond/schema/filters/meta";
import type { FieldId, Predicate } from "@pond/schema/filters/types";
import { Menu } from "@pond/ui";
import { Fragment, useState } from "react";
import { useScrollFade } from "@/hooks/use-scroll-fade";
import { FilterSelect } from "./filter-select";
import type { FilterOption } from "./options";
import {
  changeChoiceMode,
  isChoiceSelected,
  selectChoice,
  selectedChoiceMode,
} from "./selection";
import styles from "./styles.module.css";
import { useChoiceCounts } from "./use-choice-counts";

export function ChoiceFilter({
  field,
  options,
  rows,
  onChange,
}: {
  field: FieldId;
  options: FilterOption[];
  rows: Predicate[];
  onChange: (rows: Predicate[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [action, setAction] = useState<"include" | "exclude">("include");
  const scrollFade = useScrollFade<HTMLDivElement>();
  const meta = FIELD_META[field];
  const [match, setMatch] = useState(selectedChoiceMode(rows, field));
  const mode = action === "exclude" ? "exclude" : match;
  const { counts, empty, partial } = useChoiceCounts(field);
  const emptyLabel =
    field === "tags"
      ? "Untagged"
      : field === "folder"
        ? "No Folder"
        : "No List";
  const showEmpty =
    meta.type === "stringArray" &&
    emptyLabel.toLowerCase().includes(search.trim().toLowerCase());
  const allOptions = [...options];
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
  const selected = visible.filter(
    (option) =>
      isChoiceSelected(rows, option.predicate, "any") ||
      isChoiceSelected(rows, option.predicate, "exclude"),
  );
  const available = visible.filter((option) => !selected.includes(option));
  const renderOption = (option: FilterOption) => {
    const excluded = isChoiceSelected(rows, option.predicate, "exclude");
    const checked = isChoiceSelected(rows, option.predicate, mode);
    const raw = Array.isArray(option.predicate.value)
      ? option.predicate.value[0]
      : option.predicate.value;
    return (
      <Menu.CheckboxItem
        key={String(raw)}
        checked={checked}
        closeOnClick={false}
        onCheckedChange={(next) =>
          onChange(selectChoice(rows, option.predicate, next, mode))
        }
        onContextMenu={(event) => {
          event.preventDefault();
          const included = isChoiceSelected(rows, option.predicate, "any");
          onChange(
            selectChoice(
              rows,
              option.predicate,
              !excluded && !included,
              included ? match : "exclude",
            ),
          );
        }}
      >
        <Menu.CheckboxItemIndicator />
        <Menu.ItemLabel>{option.label}</Menu.ItemLabel>
        {excluded ? <Menu.SecondaryLabel>Excluded</Menu.SecondaryLabel> : null}
        <Menu.SecondaryLabel>
          {counts.get(String(raw).toLowerCase()) ?? 0}
        </Menu.SecondaryLabel>
      </Menu.CheckboxItem>
    );
  };
  return (
    <>
      <Menu.Input
        aria-label={`Filter ${meta.label}`}
        placeholder={`Filter ${meta.label.toLowerCase()}…`}
        value={search}
        onValueChange={setSearch}
      />
      <div className={styles.controls}>
        <div className={styles["control-row"]}>
          <span>Selection</span>
          <FilterSelect
            label="Selection Action"
            value={action}
            onChange={setAction}
            items={[
              { value: "include", label: "Include" },
              { value: "exclude", label: "Exclude" },
            ]}
          />
        </div>
        {meta.type === "stringArray" ? (
          <div className={styles["control-row"]}>
            <span>Match</span>
            <FilterSelect
              label="Match Selected Values"
              value={match}
              onChange={(next) => {
                setMatch(next);
                onChange(changeChoiceMode(rows, field, next));
              }}
              items={[
                { value: "any", label: "Any Selected" },
                { value: "all", label: "All Selected" },
              ]}
            />
          </div>
        ) : null}
      </div>
      <Menu.Separator />
      <div className={styles.options} {...scrollFade}>
        {showEmpty ? (
          <Menu.CheckboxItem
            closeOnClick={false}
            checked={rows.some(
              (row) =>
                row.field === field &&
                row.operator === "empty" &&
                (row.negate ?? false) === (action === "exclude"),
            )}
            onCheckedChange={(checked) =>
              onChange([
                ...rows.filter((row) => row.field !== field),
                ...(checked
                  ? [
                      {
                        field,
                        operator: "empty" as const,
                        value: true,
                        ...(action === "exclude" ? { negate: true } : {}),
                      },
                    ]
                  : []),
              ])
            }
          >
            <Menu.CheckboxItemIndicator />
            <Menu.ItemLabel>{emptyLabel}</Menu.ItemLabel>
            {rows.some(
              (row) =>
                row.field === field && row.operator === "empty" && row.negate,
            ) ? (
              <Menu.SecondaryLabel>Excluded</Menu.SecondaryLabel>
            ) : null}
            <Menu.SecondaryLabel>{empty}</Menu.SecondaryLabel>
          </Menu.CheckboxItem>
        ) : null}
        {[...selected, ...available].map((option, index) => (
          <Fragment key={JSON.stringify(option.predicate)}>
            {index === 0 && selected.length > 0 ? (
              <Menu.SectionLabel>Selected</Menu.SectionLabel>
            ) : null}
            {index === selected.length ? (
              <Menu.SectionLabel>{meta.label}</Menu.SectionLabel>
            ) : null}
            {renderOption(option)}
          </Fragment>
        ))}
        {!visible.length && !showEmpty ? (
          <Menu.Item disabled>
            <Menu.ItemLabel>
              {search ? "No matches" : "None available"}
            </Menu.ItemLabel>
          </Menu.Item>
        ) : null}
      </div>
      <Menu.Separator />
      <p className={styles.hint}>
        {partial
          ? "Counts reflect loaded saves in this view."
          : "Counts reflect this view before filters."}
      </p>
    </>
  );
}
