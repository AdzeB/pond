import {
  IconGlobeFill18 as SourceIcon,
  IconCircleCheckFill18 as StatusIcon,
  IconUserFill18 as TypeIcon,
} from "@pond/icons/fill/18";
import { Checkbox, TrayCard } from "@pond/ui";
import type { ReactNode } from "react";
import { useDock } from "@/components/library/dock/lib/context";
import {
  KIND_OPTIONS,
  SOURCE_OPTIONS,
  STATUS_OPTIONS,
  selectedSummary,
} from "@/components/library/sources/page/lib/filters";
import { useScrollFade } from "@/hooks/use-scroll-fade";
import { sourcesFilters, useSourcesFilters } from "@/stores/sources-filters";
import styles from "./styles.module.css";

export function SourcesFilterSection() {
  const dock = useDock();
  const filters = useSourcesFilters();

  return (
    <>
      <TrayCard.Header>
        <TrayCard.Title>Filter</TrayCard.Title>
        <TrayCard.Close />
        <TrayCard.Separator />
        <TrayCard.Description>
          Narrow the list by status, source, or type.
        </TrayCard.Description>
      </TrayCard.Header>
      <div className={styles.rows}>
        <FilterRow
          icon={<StatusIcon />}
          label="Status"
          value={selectedSummary(filters.statuses, STATUS_OPTIONS)}
          onClick={() => dock.openViewMenu("sources-filter-status")}
        />
        <FilterRow
          icon={<SourceIcon />}
          label="Source"
          value={selectedSummary(filters.sources, SOURCE_OPTIONS)}
          onClick={() => dock.openViewMenu("sources-filter-source")}
        />
        <FilterRow
          icon={<TypeIcon />}
          label="Type"
          value={selectedSummary(filters.kinds, KIND_OPTIONS)}
          onClick={() => dock.openViewMenu("sources-filter-type")}
        />
      </div>
    </>
  );
}

export function SourcesFilterStatusSection() {
  const filters = useSourcesFilters();
  return (
    <FilterChoices
      title="Status"
      description="Show only sources in these states."
      options={STATUS_OPTIONS}
      selected={filters.statuses}
      onToggle={(id, on) => sourcesFilters.toggleStatus(id, on)}
    />
  );
}

export function SourcesFilterSourceSection() {
  const filters = useSourcesFilters();
  return (
    <FilterChoices
      title="Source"
      description="Show only these platforms."
      options={SOURCE_OPTIONS}
      selected={filters.sources}
      onToggle={(id, on) => sourcesFilters.toggleSource(id, on)}
    />
  );
}

export function SourcesFilterTypeSection() {
  const filters = useSourcesFilters();
  return (
    <FilterChoices
      title="Type"
      description="Show accounts, watches, or both."
      options={KIND_OPTIONS}
      selected={filters.kinds}
      onToggle={(id, on) => sourcesFilters.toggleKind(id, on)}
    />
  );
}

function FilterRow({
  icon,
  label,
  value,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className={styles.row} onClick={onClick}>
      <span className={styles.icon}>{icon}</span>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
    </button>
  );
}

function FilterChoices<T extends string>({
  title,
  description,
  options,
  selected,
  onToggle,
}: {
  title: string;
  description: string;
  options: readonly { id: T; label: string }[];
  selected: ReadonlySet<T>;
  onToggle: (id: T, on: boolean) => void;
}) {
  const dock = useDock();
  const scrollFade = useScrollFade<HTMLDivElement>();
  return (
    <>
      <TrayCard.Header>
        <TrayCard.Back onClick={() => dock.openViewMenu("sources-filter")} />
        <TrayCard.Title position="center">{title}</TrayCard.Title>
        <TrayCard.Close />
        <TrayCard.Separator />
        <TrayCard.Description>{description}</TrayCard.Description>
      </TrayCard.Header>
      <div className={styles.choices} {...scrollFade}>
        {options.map((opt) => {
          const checked = selected.has(opt.id);
          const inputId = `sources-filter-${title}-${opt.id}`;
          return (
            <label key={opt.id} htmlFor={inputId} className={styles.choice}>
              <span className={styles.label}>{opt.label}</span>
              <Checkbox.Root
                id={inputId}
                size="sm"
                checked={checked}
                onCheckedChange={(on) => onToggle(opt.id, on === true)}
              >
                <Checkbox.Indicator />
              </Checkbox.Root>
            </label>
          );
        })}
      </div>
    </>
  );
}
