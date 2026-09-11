import type { FieldDescriptor } from "@pond/schema/filters/fields";
import { FIELD_DESCRIPTORS } from "@pond/schema/filters/fields";
import {
  type Clause,
  type ComparatorId,
  type FieldId,
  isGroup,
  type Predicate,
  type PredicateValue,
  type Query,
} from "@pond/schema/filters/types";
import { Button, Input, Select } from "@pond/ui";
import { useId } from "react";
import { z } from "zod";
import styles from "./rule-editor.module.css";

export interface RuleChoice {
  value: string;
  label: string;
}

export interface RuleChoices {
  folders: readonly RuleChoice[];
  tags: readonly RuleChoice[];
}

const OPERATOR_LABELS = {
  eq: "is",
  neq: "is not",
  in: "is any of",
  nin: "is none of",
  lt: "is less than",
  lte: "is at most",
  gt: "is greater than",
  gte: "is at least",
  between: "is between",
  contains: "contains",
  startsWith: "begins with",
  endsWith: "ends with",
  some: "contains any",
  every: "contains all",
  exact: "is exactly",
  none: "contains none",
  empty: "is empty",
  exists: "has a value",
  near: "is similar to",
} satisfies Record<ComparatorId, string>;

const textValue = z.union([z.string(), z.number()]);
const listValue = z.array(textValue);
const colorValue = z.object({ hex: z.string(), tolerance: z.number() });
const listOperators = new Set<string>([
  "in",
  "nin",
  "some",
  "every",
  "none",
  "exact",
]);

export function newRule(field: FieldId = "title"): Predicate {
  const descriptor = FIELD_DESCRIPTORS[field];
  const operator = descriptor.comparators.includes("contains")
    ? "contains"
    : (descriptor.comparators[0] ?? "eq");
  return {
    id: crypto.randomUUID(),
    field,
    operator,
    value: defaultValue(operator),
  };
}

function defaultValue(operator: ComparatorId): PredicateValue {
  if (operator === "empty") return null;
  if (operator === "exists") return true;
  if (operator === "between") return ["", ""];
  if (listOperators.has(operator)) return [];
  if (operator === "near") return { hex: "#808080", tolerance: 12 };
  return "";
}

export function editableQuery(query: Query): Query {
  return {
    ...query,
    id: crypto.randomUUID(),
    rules: query.rules.map((rule) =>
      isGroup(rule)
        ? editableQuery(rule)
        : { ...rule, id: crypto.randomUUID() },
    ),
  };
}

export function ruleQueryReady(query: Query): boolean {
  if (query.rules.length === 0) return !query.not;
  return query.rules.every((rule) => {
    if (isGroup(rule)) return rule.rules.length > 0 && ruleQueryReady(rule);
    const field = FIELD_DESCRIPTORS[rule.field];
    if (!field.comparators.includes(rule.operator)) return false;
    if (rule.operator === "empty") return true;
    if (rule.operator === "exists")
      return z.boolean().safeParse(rule.value).success;
    if (rule.operator === "near") {
      const color = colorValue.safeParse(rule.value);
      return color.success
        ? /^#[\da-f]{6}$/i.test(color.data.hex) && color.data.tolerance >= 0
        : z
            .string()
            .regex(/^#[\da-f]{6}$/i)
            .safeParse(rule.value).success;
    }
    const values =
      listOperators.has(rule.operator) || rule.operator === "between"
        ? listValue.safeParse(rule.value)
        : textValue.transform((value) => [value]).safeParse(rule.value);
    if (!values.success || values.data.length === 0) return false;
    if (rule.operator === "between" && values.data.length !== 2) return false;
    if (values.data.some((value) => !String(value).trim())) return false;
    if (field.type === "number") {
      if (
        (rule.field === "fileCount" || rule.field === "rating") &&
        values.data.some((value) => !Number.isInteger(Number(value)))
      )
        return false;
      if (
        rule.field === "rating" &&
        values.data.some((value) => Number(value) > 5)
      )
        return false;
      if (
        values.data.some(
          (value) => !Number.isFinite(Number(value)) || Number(value) < 0,
        )
      )
        return false;
      if (
        rule.operator === "between" &&
        Number(values.data[0]) > Number(values.data[1])
      )
        return false;
    }
    if (field.type === "date") {
      if (
        values.data.some(
          (value) =>
            !/^-P\d+[DWMY]$/.test(String(value)) &&
            !Number.isFinite(new Date(value).getTime()),
        )
      )
        return false;
      if (
        rule.operator === "between" &&
        new Date(values.data[0] ?? "").getTime() >
          new Date(values.data[1] ?? "").getTime()
      )
        return false;
    }
    if (
      rule.field === "aspect" &&
      values.data.some(
        (value) =>
          !/^\d+(\.\d+)?:\d+(\.\d+)?$/.test(String(value)) ||
          String(value)
            .split(":")
            .some((part) => Number(part) <= 0),
      )
    )
      return false;
    return true;
  });
}

export function compileRuleQuery(query: Query): Query {
  return {
    ...query,
    rules: query.rules.map((rule) => {
      if (isGroup(rule)) return compileRuleQuery(rule);
      const field = FIELD_DESCRIPTORS[rule.field];
      const normalize = (
        value: string | number,
        upper: boolean,
      ): string | number => {
        if (field.type === "number") return Number(value);
        if (
          field.type === "date" &&
          /^\d{4}-\d{2}-\d{2}$/.test(String(value))
        ) {
          const date = new Date(`${value}T00:00:00`);
          if (upper) {
            date.setDate(date.getDate() + 1);
            date.setMilliseconds(-1);
          }
          return date.toISOString();
        }
        return value;
      };
      const list = listValue.safeParse(rule.value);
      const scalar = textValue.safeParse(rule.value);
      const value = list.success
        ? list.data.map((entry, index) =>
            normalize(entry, rule.operator === "between" && index === 1),
          )
        : scalar.success
          ? normalize(
              scalar.data,
              rule.operator === "lte" || rule.operator === "gt",
            )
          : rule.value;
      return { ...rule, value };
    }),
  };
}

function RuleSelect<T extends string>({
  value,
  items,
  label,
  onChange,
}: {
  value: T;
  items: readonly { value: T; label: string }[];
  label: string;
  onChange: (value: T) => void;
}) {
  return (
    <Select.Root
      value={value}
      items={items}
      onValueChange={(next) => {
        if (next !== null) onChange(next);
      }}
    >
      <Select.Trigger className={styles.select} size="md" aria-label={label}>
        <Select.Value />
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner>
          <Select.Popup>
            <Select.Items items={[...items]} />
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}

function FieldInput({
  value,
  onChange,
  label,
  type = "text",
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  type?: "text" | "number" | "date" | "color";
  placeholder?: string;
}) {
  return (
    <Input.Root className={styles.input}>
      <Input.Field
        aria-label={label}
        value={value}
        onValueChange={onChange}
        type={type}
        placeholder={placeholder}
        min={type === "number" ? 0 : undefined}
        step={type === "number" ? "any" : undefined}
      />
    </Input.Root>
  );
}

function scalar(value: PredicateValue): string {
  const result = textValue.safeParse(value);
  return result.success ? String(result.data) : "";
}

function choicesFor(
  field: FieldDescriptor,
  choices: RuleChoices,
): readonly RuleChoice[] {
  if (field.id === "folder") return choices.folders;
  if (field.id === "tags") return choices.tags;
  return (field.presets ?? []).flatMap((preset) => {
    const value = textValue.safeParse(preset.value);
    return value.success
      ? [{ label: preset.label, value: String(value.data) }]
      : [];
  });
}

function ChoiceValue({
  rule,
  choices,
  onChange,
}: {
  rule: Predicate;
  choices: readonly RuleChoice[];
  onChange: (value: PredicateValue) => void;
}) {
  const selected = listValue.safeParse(rule.value);
  const values = selected.success ? selected.data.map(String) : [];
  const items = [
    ...choices,
    ...values
      .filter((value) => !choices.some((choice) => choice.value === value))
      .map((value) => ({ value, label: value })),
  ];
  return (
    <Select.Root multiple value={values} items={items} onValueChange={onChange}>
      <Select.Trigger
        size="md"
        className={styles.select}
        aria-label={`${FIELD_DESCRIPTORS[rule.field].label} Values`}
      >
        <Select.Value placeholder="Choose Values" />
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner>
          <Select.Popup>
            <Select.Items items={items} />
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}

function DateValue({
  value,
  onChange,
  label,
}: {
  value: PredicateValue;
  onChange: (value: string) => void;
  label: string;
}) {
  const raw = scalar(value);
  const relative = raw.startsWith("-P");
  const presets = [
    { value: "date", label: "Date" },
    { value: "-P1D", label: "1 Day Ago" },
    { value: "-P7D", label: "7 Days Ago" },
    { value: "-P30D", label: "30 Days Ago" },
    { value: "-P1Y", label: "1 Year Ago" },
  ];
  if (relative && !presets.some((preset) => preset.value === raw))
    presets.push({ value: raw, label: raw });
  return (
    <div className={styles.values}>
      <RuleSelect
        value={relative ? raw : "date"}
        items={presets}
        label={`${label} Mode`}
        onChange={(next) => onChange(next === "date" ? "" : next)}
      />
      {!relative ? (
        <FieldInput
          label={label}
          type="date"
          value={raw.slice(0, 10)}
          onChange={onChange}
        />
      ) : null}
    </div>
  );
}

function RuleValue({
  rule,
  choices,
  onChange,
}: {
  rule: Predicate;
  choices: RuleChoices;
  onChange: (value: PredicateValue) => void;
}) {
  const field = FIELD_DESCRIPTORS[rule.field];
  const label = `${field.label} Value`;
  if (rule.operator === "empty")
    return <span className={styles.noValue}>No values</span>;
  if (rule.operator === "exists")
    return (
      <RuleSelect
        value={rule.value === false ? "false" : "true"}
        label={label}
        items={[
          { value: "true", label: "Yes" },
          { value: "false", label: "No" },
        ]}
        onChange={(value) => onChange(value === "true")}
      />
    );
  if (rule.operator === "near") {
    const color = colorValue.safeParse(rule.value);
    const hex = color.success
      ? color.data.hex
      : scalar(rule.value) || "#808080";
    const tolerance = color.success ? color.data.tolerance : 12;
    return (
      <div className={styles.values}>
        <FieldInput
          label={label}
          type="color"
          value={hex}
          onChange={(next) => onChange({ hex: next, tolerance })}
        />
        <RuleSelect
          value={String(tolerance)}
          label="Color Similarity"
          items={[
            { value: "5", label: "Almost the Same" },
            { value: "12", label: "Similar" },
            { value: "25", label: "Broad" },
            ...([5, 12, 25].includes(tolerance)
              ? []
              : [{ value: String(tolerance), label: String(tolerance) }]),
          ]}
          onChange={(next) => onChange({ hex, tolerance: Number(next) })}
        />
      </div>
    );
  }
  if (rule.operator === "between") {
    const parsed = listValue.safeParse(rule.value);
    const values = parsed.success ? parsed.data : ["", ""];
    return (
      <div className={styles.values}>
        {[0, 1].map((index) => {
          const value = String(values[index] ?? "");
          const change = (next: string) =>
            onChange(
              index === 0 ? [next, values[1] ?? ""] : [values[0] ?? "", next],
            );
          return field.type === "date" ? (
            <DateValue
              key={index}
              value={value}
              onChange={change}
              label={`${label} ${index === 0 ? "From" : "To"}`}
            />
          ) : (
            <FieldInput
              key={index}
              type="number"
              label={`${label} ${index === 0 ? "From" : "To"}`}
              value={value}
              onChange={change}
            />
          );
        })}
      </div>
    );
  }
  if (field.type === "date")
    return <DateValue value={rule.value} onChange={onChange} label={label} />;
  const options = choicesFor(field, choices);
  if (listOperators.has(rule.operator)) {
    if (options.length > 0 || field.id === "folder")
      return <ChoiceValue rule={rule} choices={options} onChange={onChange} />;
    const parsed = listValue.safeParse(rule.value);
    return (
      <FieldInput
        label={label}
        value={parsed.success ? parsed.data.join(", ") : ""}
        placeholder="Separate values with commas"
        onChange={(next) =>
          onChange(next.split(",").map((value) => value.trim()))
        }
      />
    );
  }
  if (options.length > 0 && field.type === "enum" && field.id !== "aspect")
    return (
      <RuleSelect
        label={label}
        value={scalar(rule.value)}
        items={[{ value: "", label: "Choose Value" }, ...options]}
        onChange={onChange}
      />
    );
  return (
    <FieldInput
      label={label}
      type={field.type === "number" ? "number" : "text"}
      value={scalar(rule.value)}
      onChange={onChange}
      placeholder={
        field.id === "aspect"
          ? "16:9"
          : field.id === "duration"
            ? "Seconds"
            : field.id === "fileSize"
              ? "Bytes"
              : undefined
      }
    />
  );
}

export function RuleEditor({
  query,
  choices,
  onChange,
  onRemove,
  path = "Rules",
}: {
  query: Query;
  choices: RuleChoices;
  onChange: (query: Query) => void;
  onRemove?: () => void;
  path?: string;
}) {
  const labelId = useId();
  const update = (index: number, clause: Clause) =>
    onChange({
      ...query,
      rules: query.rules.map((rule, position) =>
        position === index ? clause : rule,
      ),
    });
  const remove = (index: number) =>
    onChange({
      ...query,
      rules: query.rules.filter((_, position) => position !== index),
    });
  return (
    <fieldset className={styles.group} aria-labelledby={labelId}>
      <legend id={labelId} className={styles.srOnly}>
        {path}
      </legend>
      <div className={styles.groupHeader}>
        <RuleSelect
          value={query.combinator}
          label={`${path} Match`}
          items={[
            { value: "or", label: "any" },
            { value: "and", label: "all" },
          ]}
          onChange={(combinator) => onChange({ ...query, combinator })}
        />
        <span>of the following are</span>
        <RuleSelect
          value={query.not ? "false" : "true"}
          label={`${path} Truth`}
          items={[
            { value: "true", label: "true" },
            { value: "false", label: "false" },
          ]}
          onChange={(truth) => onChange({ ...query, not: truth === "false" })}
        />
        <span className={styles.spacer} />
        {onRemove ? (
          <Button
            icon
            variant="secondary"
            aria-label={`Remove ${path}`}
            onClick={onRemove}
          >
            −
          </Button>
        ) : null}
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            onChange({
              ...query,
              rules: [
                ...query.rules,
                {
                  id: crypto.randomUUID(),
                  combinator: "and",
                  rules: [newRule()],
                },
              ],
            })
          }
        >
          Add Rule Group
        </Button>
        <Button
          icon
          variant="secondary"
          aria-label={`Add Rule to ${path}`}
          onClick={() =>
            onChange({ ...query, rules: [...query.rules, newRule()] })
          }
        >
          +
        </Button>
      </div>
      <div className={styles.rules}>
        {query.rules.map((rule, index) =>
          isGroup(rule) ? (
            <RuleEditor
              key={rule.id}
              query={rule}
              choices={choices}
              path={`${path} Group ${index + 1}`}
              onChange={(next) => update(index, next)}
              onRemove={() => remove(index)}
            />
          ) : (
            <div key={rule.id} className={styles.rule}>
              <RuleSelect
                value={rule.field}
                label={`Rule ${index + 1} Field`}
                items={Object.values(FIELD_DESCRIPTORS).map(
                  ({ id, label }) => ({ value: id, label }),
                )}
                onChange={(field) =>
                  update(index, { ...newRule(field), id: rule.id })
                }
              />
              <RuleSelect
                value={rule.operator}
                label={`Rule ${index + 1} Operator`}
                items={FIELD_DESCRIPTORS[rule.field].comparators.map(
                  (operator) => ({
                    value: operator,
                    label: OPERATOR_LABELS[operator] ?? operator,
                  }),
                )}
                onChange={(operator) =>
                  update(index, {
                    ...rule,
                    operator,
                    value: defaultValue(operator),
                  })
                }
              />
              <div className={styles.value}>
                <RuleValue
                  rule={rule}
                  choices={choices}
                  onChange={(value) => update(index, { ...rule, value })}
                />
              </div>
              <Button
                size="sm"
                variant={rule.negate ? "secondary" : "ghost"}
                aria-label={`Negate Rule ${index + 1}`}
                aria-pressed={Boolean(rule.negate)}
                onClick={() => update(index, { ...rule, negate: !rule.negate })}
              >
                Not
              </Button>
              <Button
                icon
                variant="ghost"
                aria-label={`Remove Rule ${index + 1}`}
                onClick={() => remove(index)}
              >
                −
              </Button>
              <Button
                icon
                variant="secondary"
                aria-label={`Add Rule after Rule ${index + 1}`}
                onClick={() =>
                  onChange({
                    ...query,
                    rules: [
                      ...query.rules.slice(0, index + 1),
                      newRule(),
                      ...query.rules.slice(index + 1),
                    ],
                  })
                }
              >
                +
              </Button>
            </div>
          ),
        )}
        {query.rules.length === 0 ? (
          <p className={styles.noValue}>
            All saves match. Add a rule to narrow the results.
          </p>
        ) : null}
      </div>
    </fieldset>
  );
}
