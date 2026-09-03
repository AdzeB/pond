import { IconXmarkOutline12 } from "@pond/icons/outline/12";
import { FIELD_META } from "@pond/schema/filters/meta";
import type { FieldId, Predicate } from "@pond/schema/filters/types";
import { Button, Menu } from "@pond/ui";
import { useState } from "react";
import { FIELD_ICONS } from "@/lib/search/fields";
import { libraryHeader } from "@/stores/library-header";
import { ChoiceFilter } from "./choice-filter";
import { ColorFilter } from "./color-filter";
import { ContentFilter } from "./content-filter";
import { CustomFilter, type DurationUnit } from "./custom-filter";
import { filterLayout } from "./layout";
import type { FilterOption } from "./options";
import { isFilterSelected, selectFilter } from "./selection";
import styles from "./styles.module.css";
import { filterSummary } from "./summary";
import { type FilterTagGroup, TagChoiceFilter } from "./tag-choice-filter";

export function FilterCategory({
  field,
  options,
  tagGroups = [],
  rows,
  onChange,
}: {
  field: FieldId;
  options: FilterOption[];
  tagGroups?: readonly FilterTagGroup[];
  rows: Predicate[];
  onChange: (rows: Predicate[]) => void;
}) {
  const meta = FIELD_META[field];
  const Icon = FIELD_ICONS[field];
  const activeRules = rows.filter((row) => row.field === field);
  const active = activeRules.length > 0;
  const summary = filterSummary(activeRules, options);
  const label = active
    ? summary.startsWith(`${meta.label}: `)
      ? summary
      : `${meta.label}: ${summary}`
    : meta.label;
  const layout = filterLayout(field, options.length);
  return (
    <div className={styles.category} data-active={active || undefined}>
      <Menu.Root
        onOpenChange={(open) => {
          if (open) libraryHeader.closePopover();
        }}
      >
        <Menu.Trigger
          size="sm"
          variant="ghost"
          className={styles["category-trigger"]}
          aria-label={label}
          title={label}
        >
          <span className={styles["category-icon"]} aria-hidden>
            <Icon />
          </span>
          <span className={styles["category-label"]}>
            {summary || meta.label}
          </span>
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner side="bottom" align="start" sideOffset={6}>
            <Menu.Popup
              className={styles.popup}
              data-layout={layout}
              aria-label={`${meta.label} Filter`}
            >
              <FilterEditor
                field={field}
                options={options}
                tagGroups={tagGroups}
                rows={rows}
                onChange={onChange}
              />
              {active ? (
                <>
                  <Menu.Separator />
                  <Menu.Item
                    closeOnClick={false}
                    onClick={() =>
                      onChange(rows.filter((row) => row.field !== field))
                    }
                  >
                    <Menu.ItemLabel>Clear Filter</Menu.ItemLabel>
                  </Menu.Item>
                </>
              ) : null}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      {active ? (
        <Button
          icon
          size="xs"
          variant="ghost"
          className={styles["category-clear"]}
          aria-label={`Clear ${meta.label} Filter`}
          onClick={() => onChange(rows.filter((row) => row.field !== field))}
        >
          <IconXmarkOutline12 />
        </Button>
      ) : null}
    </div>
  );
}

function FilterEditor({
  field,
  options,
  tagGroups,
  rows,
  onChange,
}: {
  field: FieldId;
  options: FilterOption[];
  tagGroups: readonly FilterTagGroup[];
  rows: Predicate[];
  onChange: (rows: Predicate[]) => void;
}) {
  const type = FIELD_META[field].type;
  const current = rows.find((row) => row.field === field);
  const [rangeUnit, setRangeUnit] = useState<DurationUnit>("seconds");
  const [customDate, setCustomDate] = useState(
    !!current &&
      !options.some((option) => isFilterSelected([current], option.predicate)),
  );
  const apply = (predicate: Predicate) =>
    onChange(selectFilter(rows, predicate, true));
  if (field === "tags")
    return (
      <TagChoiceFilter
        options={options}
        groups={tagGroups}
        rows={rows}
        onChange={onChange}
      />
    );
  if (type === "enum" || type === "stringArray")
    return (
      <ChoiceFilter
        field={field}
        options={options}
        rows={rows}
        onChange={onChange}
      />
    );
  if (type === "optional" || type === "string")
    return (
      <ContentFilter
        key={JSON.stringify(current)}
        field={field}
        rows={rows}
        onChange={onChange}
      />
    );
  if (type === "color")
    return <ColorFilter current={current} onApply={apply} />;
  return (
    <>
      {options.map((option) => (
        <Menu.CheckboxItem
          key={JSON.stringify(option.predicate)}
          closeOnClick={false}
          checked={isFilterSelected(rows, option.predicate)}
          onCheckedChange={(checked) => {
            setCustomDate(false);
            onChange(selectFilter(rows, option.predicate, checked));
          }}
        >
          <Menu.CheckboxItemIndicator />
          <Menu.ItemLabel>{option.label}</Menu.ItemLabel>
        </Menu.CheckboxItem>
      ))}
      <Menu.Separator />
      {type === "date" ? (
        <Menu.CheckboxItem
          checked={customDate}
          closeOnClick={false}
          onCheckedChange={setCustomDate}
        >
          <Menu.CheckboxItemIndicator />
          <Menu.ItemLabel>Custom Range</Menu.ItemLabel>
        </Menu.CheckboxItem>
      ) : null}
      {type === "number" || customDate ? (
        <CustomFilter
          key={JSON.stringify(current)}
          field={field}
          current={current}
          initialUnit={rangeUnit}
          onUnitChange={setRangeUnit}
          onApply={apply}
        />
      ) : null}
    </>
  );
}
