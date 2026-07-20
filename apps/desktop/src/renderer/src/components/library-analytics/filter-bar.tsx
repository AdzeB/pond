import {
  IconBarsFilterOutline18 as FilterIcon,
  IconXmarkOutline18 as Xmark,
} from "@pond/icons/outline/18";
import type { InsightFilter } from "@pond/schema/db";
import { Button, Menu } from "@pond/ui";
import { BrandTile } from "@/components/library-sync-monitor-source-tile";
import type { Save } from "@/lib/types";
import {
  FILTER_FIELD_OPTIONS,
  filterValueLabel,
  filterValueOptions,
} from "./lib/insights";
import styles from "./styles.module.css";

/** One filter chip per field, used by the insight editor. */

interface FilterBarProps {
  filters: InsightFilter[];
  /** Saves pool, used to offer tag/creator/type values that exist. */
  saves?: readonly Save[];
  onChange: (filters: InsightFilter[]) => void;
}

function chipLabel(filter: InsightFilter): string {
  const field =
    FILTER_FIELD_OPTIONS.find((f) => f.value === filter.field)?.label ??
    filter.field;
  const verb = filter.op === "include" ? "is" : "is not";
  const names = filter.values.map((v) => filterValueLabel(filter.field, v));
  const shown = names.slice(0, 2).join(", ");
  const more = names.length > 2 ? ` +${names.length - 2}` : "";
  return `${field} ${verb} ${shown}${more}`;
}

function ValueOptionRow({
  label,
  source,
}: {
  label: string;
  source: ReturnType<typeof filterValueOptions>[number]["source"];
}) {
  return (
    <span className={styles["filter-option"]}>
      {source ? <BrandTile source={source} size={16} /> : null}
      {label}
    </span>
  );
}

export function FilterBar({ filters, saves = [], onChange }: FilterBarProps) {
  const patchFilter = (index: number, patch: Partial<InsightFilter>) => {
    const next = filters.map((f, i) => (i === index ? { ...f, ...patch } : f));
    onChange(next.filter((f) => f.values.length > 0));
  };

  const toggleValue = (index: number, value: string) => {
    const filter = filters[index];
    if (!filter) return;
    const values = filter.values.includes(value)
      ? filter.values.filter((v) => v !== value)
      : [...filter.values, value];
    patchFilter(index, { values });
  };

  /** Merges into an existing chip for the field, keeping one chip per field. */
  const addValue = (field: InsightFilter["field"], value: string) => {
    const index = filters.findIndex((f) => f.field === field);
    if (index >= 0) {
      const filter = filters[index];
      if (filter && !filter.values.includes(value)) {
        patchFilter(index, { values: [...filter.values, value] });
      }
      return;
    }
    onChange([...filters, { field, op: "include", values: [value] }]);
  };

  return (
    <div className={styles["filter-bar"]}>
      {filters.map((filter, index) => (
        <span key={filter.field} className={styles.chip}>
          <Menu.Root>
            <Menu.Trigger
              render={
                <button type="button" className={styles["chip-button"]} />
              }
            >
              {chipLabel(filter)}
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner align="start">
                <Menu.Popup>
                  <Menu.RadioGroup
                    value={filter.op}
                    onValueChange={(op) =>
                      patchFilter(index, { op: op as InsightFilter["op"] })
                    }
                  >
                    <Menu.RadioItem value="include" closeOnClick={false}>
                      <Menu.ItemLabel>Include</Menu.ItemLabel>
                      <Menu.RadioItemIndicator />
                    </Menu.RadioItem>
                    <Menu.RadioItem value="exclude" closeOnClick={false}>
                      <Menu.ItemLabel>Exclude</Menu.ItemLabel>
                      <Menu.RadioItemIndicator />
                    </Menu.RadioItem>
                  </Menu.RadioGroup>
                  <Menu.Separator />
                  {filterValueOptions(filter.field, saves).map((option) => (
                    <Menu.CheckboxItem
                      key={option.value}
                      checked={filter.values.includes(option.value)}
                      closeOnClick={false}
                      onCheckedChange={() => toggleValue(index, option.value)}
                    >
                      <Menu.ItemLabel>
                        <ValueOptionRow
                          label={option.label}
                          source={option.source}
                        />
                      </Menu.ItemLabel>
                      <Menu.CheckboxItemIndicator />
                    </Menu.CheckboxItem>
                  ))}
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
          <button
            type="button"
            className={styles["chip-x"]}
            aria-label={`Remove ${filter.field} filter`}
            onClick={() => onChange(filters.filter((_, i) => i !== index))}
          >
            <Xmark width={11} height={11} />
          </button>
        </span>
      ))}

      <Menu.Root>
        <Menu.Trigger
          size="sm"
          variant="ghost"
          className={styles["filter-add"]}
          aria-label="Add filter"
        >
          <FilterIcon width={13} height={13} />
          Filter
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner align="start">
            <Menu.Popup>
              <Menu.Items
                items={FILTER_FIELD_OPTIONS.map((field) => ({
                  type: "submenu" as const,
                  label: field.label,
                  items: filterValueOptions(field.value, saves).map(
                    (option) => ({
                      label: (
                        <ValueOptionRow
                          label={option.label}
                          source={option.source}
                        />
                      ),
                      onClick: () => addValue(field.value, option.value),
                    }),
                  ),
                }))}
              />
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>

      {filters.length > 0 ? (
        <Button size="sm" variant="ghost" onClick={() => onChange([])}>
          Clear
        </Button>
      ) : null}
    </div>
  );
}
