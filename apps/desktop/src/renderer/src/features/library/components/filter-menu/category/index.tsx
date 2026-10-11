import { readColorMatch } from "@pond/schema/filters/color";
import { FIELD_META } from "@pond/schema/filters/meta";
import type { FieldId, Predicate } from "@pond/schema/filters/types";
import { Chip } from "@pond/ui";
import { useState } from "react";
import { fieldIcon } from "@/features/search/query";
import { useMenuFilterQuery } from "@/shared/hooks/use-menu-filter-query";
import { FilterChip, FilterPopup } from "../chip";
import { ChoiceFilter } from "../choice";
import { ColorFilter } from "../color";
import { ContentFilter } from "../content";
import { choiceIsSearchable, filterLayout } from "../layout";
import type { FilterOption } from "../options";
import { CustomFilter, type RangeUnit } from "../range";
import { DimensionsFilter } from "../range/dimensions";
import { selectedChoiceMode, selectFilter } from "../selection";
import { filterSummary } from "../summary";
import { type FilterTagGroup, TagChoiceFilter } from "../tags";

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
  const Icon = fieldIcon(field);
  const categoryFields = new Set<FieldId>(
    field === "width" ? ["width", "height"] : [field],
  );
  const activeRules = rows.filter((row) => categoryFields.has(row.field));
  const active = activeRules.length > 0;
  const selectedColor =
    field === "color"
      ? (readColorMatch(activeRules[0]?.value)?.hex ?? undefined)
      : undefined;
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
  const { query, onValueChange, reset } = useMenuFilterQuery();
  const searchable =
    field === "tags" ||
    ((meta.type === "enum" || meta.type === "stringArray") &&
      choiceIsSearchable(field, options.length));
  const clear = () => {
    setEditorVersion((version) => version + 1);
    onChange(rows.filter((row) => !categoryFields.has(row.field)));
  };
  return (
    <FilterChip
      icon={
        field === "color" ? <Chip.Swatch color={selectedColor} /> : <Icon />
      }
      label={selectedColor ? meta.label : summary || meta.label}
      title={label}
      active={active}
      ariaLabel={label}
      onClear={active ? clear : undefined}
      clearLabel={`Clear ${meta.label} Filter`}
      search={
        searchable ? { filter: null, value: query, onValueChange } : undefined
      }
      onOpen={reset}
    >
      <FilterPopup layout={layout} aria-label={`${meta.label} Filter`}>
        <FilterEditor
          key={editorVersion}
          field={field}
          options={options}
          tagGroups={tagGroups}
          matching={matching}
          rows={rows}
          search={query}
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
  search,
  onChange,
}: {
  field: FieldId;
  options: FilterOption[];
  tagGroups: readonly FilterTagGroup[];
  matching?: "any" | "all";
  rows: Predicate[];
  search: string;
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
        search={search}
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
        search={search}
        onChange={onChange}
      />
    );
  if (type === "optional" || type === "string")
    return <ContentFilter field={field} rows={rows} onChange={onChange} />;
  if (type === "color")
    return (
      <ColorFilter current={current} onApply={apply} onClear={clearField} />
    );
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
