import { FIELD_META } from "@pond/schema/filters/meta";
import type { FieldId, Predicate } from "@pond/schema/filters/types";
import { Button, Input } from "@pond/ui";
import { useId, useState } from "react";
import { FilterSelect } from "./filter-select";
import styles from "./styles.module.css";

export type DurationUnit = "seconds" | "minutes" | "hours";

function unitFactor(unit: DurationUnit): number {
  return unit === "hours" ? 3600 : unit === "minutes" ? 60 : 1;
}

function localDate(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(value)) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function rangeBounds(predicate?: Predicate): [unknown, unknown] {
  if (!predicate) return ["", ""];
  if (predicate.operator === "between" && Array.isArray(predicate.value))
    return [predicate.value[0], predicate.value[1]];
  if (predicate.operator === "eq") return [predicate.value, predicate.value];
  if (["gte", "gt"].includes(predicate.operator)) return [predicate.value, ""];
  if (["lte", "lt"].includes(predicate.operator)) return ["", predicate.value];
  return ["", ""];
}

export function rangePredicate(
  field: FieldId,
  start: string,
  end: string,
  multiplier = 1,
): Predicate | null {
  if (!start && !end) return null;
  const date = FIELD_META[field].type === "date";
  const bound = (text: string, last: boolean): number => {
    if (!date) return Number(text) * multiplier;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return Number.NaN;
    const value = new Date(`${text}T00:00:00`);
    if (!Number.isFinite(value.getTime())) return Number.NaN;
    if (localDate(value.toISOString()) !== text) return Number.NaN;
    if (last) {
      value.setDate(value.getDate() + 1);
      value.setMilliseconds(-1);
    }
    return value.getTime();
  };
  const lo = start ? bound(start, false) : null;
  const hi = end ? bound(end, true) : null;
  if (
    [lo, hi].some(
      (value) =>
        value !== null &&
        (!Number.isFinite(value) ||
          (!date &&
            (value < 0 ||
              (field === "fileCount" && !Number.isInteger(value))))),
    )
  )
    return null;
  if (lo !== null && hi !== null && lo > hi) return null;
  const value = (n: number) => (date ? new Date(n).toISOString() : n);
  if (lo !== null && hi !== null)
    return {
      field,
      operator: !date && lo === hi ? "eq" : "between",
      value: !date && lo === hi ? lo : [value(lo), value(hi)],
    };
  return lo !== null
    ? { field, operator: "gte", value: value(lo) }
    : hi !== null
      ? { field, operator: "lte", value: value(hi) }
      : null;
}

export function CustomFilter({
  field,
  current,
  initialUnit = "seconds",
  onUnitChange,
  onApply,
}: {
  field: FieldId;
  current?: Predicate;
  initialUnit?: DurationUnit;
  onUnitChange?: (unit: DurationUnit) => void;
  onApply: (predicate: Predicate) => void;
}) {
  const date = FIELD_META[field].type === "date";
  const [lo, hi] = rangeBounds(current);
  const startId = useId();
  const endId = useId();
  const initialValue = (value: unknown) =>
    date
      ? localDate(value)
      : value === ""
        ? ""
        : String(Number(value) / unitFactor(initialUnit));
  const [start, setStart] = useState(initialValue(lo));
  const [end, setEnd] = useState(initialValue(hi));
  const [unit, setUnit] = useState<DurationUnit>(initialUnit);
  const factor = unitFactor(unit);
  const draft = rangePredicate(field, start, end, factor);
  const sameBound = (text: string, value: unknown) => {
    if (date) return text === localDate(value);
    if (text === "" || value === "") return text === value;
    return (
      Math.abs(Number(text) * factor - Number(value)) <=
      Math.max(1, Math.abs(Number(value))) * 1e-10
    );
  };
  const unchanged = !!current && sameBound(start, lo) && sameBound(end, hi);
  const predicate = draft && unchanged ? current : draft;
  return (
    <form
      className={styles.form}
      onKeyDown={(event) => {
        if (event.key !== "Escape" && event.key !== "Tab")
          event.stopPropagation();
      }}
      onSubmit={(event) => {
        event.preventDefault();
        if (predicate) onApply(predicate);
      }}
    >
      <div className={styles["range-row"]}>
        <label className={styles.field} htmlFor={startId}>
          {date
            ? "From"
            : unchanged && current?.operator === "gt"
              ? "More Than"
              : "Minimum"}
          <Input.Root size="sm">
            <Input.Field
              id={startId}
              type={date ? "date" : "number"}
              min={date ? undefined : 0}
              step={field === "duration" ? "any" : 1}
              value={start}
              onValueChange={setStart}
              placeholder={date ? undefined : "Min"}
            />
          </Input.Root>
        </label>
        <label className={styles.field} htmlFor={endId}>
          {date
            ? "To"
            : unchanged && current?.operator === "lt"
              ? "Less Than"
              : "Maximum"}
          <Input.Root size="sm">
            <Input.Field
              id={endId}
              type={date ? "date" : "number"}
              min={date ? undefined : 0}
              step={field === "duration" ? "any" : 1}
              value={end}
              onValueChange={setEnd}
              placeholder={date ? undefined : "Max"}
            />
          </Input.Root>
        </label>
      </div>
      {field === "duration" ? (
        <div className={styles["control-row"]}>
          <span>Unit</span>
          <FilterSelect
            label="Duration Unit"
            value={unit}
            items={[
              { value: "seconds", label: "Seconds" },
              { value: "minutes", label: "Minutes" },
              { value: "hours", label: "Hours" },
            ]}
            onChange={(next) => {
              const nextFactor = unitFactor(next);
              const convert = (value: string) =>
                value
                  ? String(
                      Number(
                        ((Number(value) * factor) / nextFactor).toPrecision(12),
                      ),
                    )
                  : "";
              setStart(convert(start));
              setEnd(convert(end));
              setUnit(next);
              onUnitChange?.(next);
            }}
          />
        </div>
      ) : null}
      <p className={styles.hint}>Leave either bound empty for an open range.</p>
      {(start || end) && !predicate ? (
        <p className={styles.error} role="status">
          Enter a valid range with the minimum first.
        </p>
      ) : null}
      <Button type="submit" size="sm" variant="secondary" disabled={!predicate}>
        Apply Filter
      </Button>
    </form>
  );
}
