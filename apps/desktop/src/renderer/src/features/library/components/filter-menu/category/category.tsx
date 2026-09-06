import { FIELD_META } from "@pond/schema/filters/meta";
import type { FieldId, Predicate } from "@pond/schema/filters/types";
import { useState } from "react";
import { FIELD_ICONS } from "@/features/search/lib/fields";
import { FilterChip, FilterPopup } from "../chip/chip";
import { ChoiceFilter } from "../choice/choice";
import { ColorFilter } from "../color/color";
import { ContentFilter } from "../content/content";
import { filterLayout } from "../layout";
import type { FilterOption } from "../options";
import { DimensionsFilter } from "../range/dimensions";
import { CustomFilter, type RangeUnit } from "../range/range";
import { selectedChoiceMode, selectFilter } from "../selection";
import { filterSummary } from "../summary";
import { type FilterTagGroup, TagChoiceFilter } from "../tags/tags";

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
  const categoryFields = new Set<FieldId>(
    field === "width" ? ["width", "height"] : [field],
  );
  const activeRules = rows.filter((row) => categoryFields.has(row.field));
  const active = activeRules.length > 0;
  const summary =
    field === "width"
      ? activeRules
          .map(
            (row) =>
              `${row.field === "width" ? "W" : "H"} ${filterSummary([row], [])}`,
          )
          .join(" · ")
      : filterSummary(activeRules, options);
  const label = active
    ? summary.startsWith(`${meta.label}: `)
      ? summary
      : `${meta.label}: ${summary}`
    : meta.label;
  const layout = filterLayout(field, options.length);
  const matching = selectedChoiceMode(rows, field);
  const [editorVersion, setEditorVersion] = useState(0);
  const clear = () => {
    setEditorVersion((version) => version + 1);
    onChange(rows.filter((row) => !categoryFields.has(row.field)));
  };
  return (
    <FilterChip
      icon={<Icon />}
      label={summary || meta.label}
      title={label}
      active={active}
      ariaLabel={label}
      onClear={active ? clear : undefined}
      clearLabel={`Clear ${meta.label} Filter`}
    >
      <FilterPopup layout={layout} aria-label={`${meta.label} Filter`}>
        <FilterEditor
          key={editorVersion}
          field={field}
          options={options}
          tagGroups={tagGroups}
          matching={matching}
          rows={rows}
          onChange={onChange}
        />
      </FilterPopup>
    </FilterChip>
  );
}

function FilterEditor({
  field,
  options,
  tagGroups,
  matching = "any",
  rows,
  onChange,
}: {
  field: FieldId;
  options: FilterOption[];
  tagGroups: readonly FilterTagGroup[];
  matching?: "any" | "all";
  rows: Predicate[];
  onChange: (rows: Predicate[]) => void;
}) {
  const type = FIELD_META[field].type;
  const current = rows.find((row) => row.field === field);
  const [rangeUnit, setRangeUnit] = useState<RangeUnit>(
    field === "fileSize" ? "kilobytes" : "seconds",
  );
  const apply = (predicate: Predicate) =>
    onChange(selectFilter(rows, predicate, true));
  const clearField = () => onChange(rows.filter((row) => row.field !== field));
  if (field === "width")
    return <DimensionsFilter rows={rows} onChange={onChange} />;
  if (field === "tags")
    return (
      <TagChoiceFilter
        options={options}
        groups={tagGroups}
        matching={matching}
        rows={rows}
        onChange={onChange}
      />
    );
  if (type === "enum" || type === "stringArray")
    return (
      <ChoiceFilter
        field={field}
        options={options}
        matching={matching}
        rows={rows}
        onChange={onChange}
      />
    );
  if (type === "optional" || type === "string")
    return <ContentFilter field={field} rows={rows} onChange={onChange} />;
  if (type === "color")
    return <ColorFilter current={current} onApply={apply} />;
  if (type === "number" || type === "date")
    return (
      <CustomFilter
        field={field}
        current={current}
        initialUnit={rangeUnit}
        onUnitChange={setRangeUnit}
        onApply={apply}
        onClear={clearField}
      />
    );
  return null;
}
