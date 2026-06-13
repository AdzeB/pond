import { Menu } from "@pond/ui";
import { Fragment, type ReactNode, useMemo } from "react";
import styles from "@/components/library-view-menu/filter/value-select/styles.module.css";

interface PickerItem {
  /** Canonical value used for selection state and as the React key. */
  value: string;
  /** Display label; falls back to `value`. */
  label?: ReactNode;
  /** Optional trailing count. */
  count?: number;
  /** Optional leading flag rendered between the checkbox and the label. */
  flag?: ReactNode;
}

interface PickerSection {
  key: string;
  /** A header is rendered only when a label is provided. */
  label?: ReactNode;
  /** Optional glyph rendered before the section label. */
  icon?: ReactNode;
  items: PickerItem[];
}

interface LivePickerProps {
  query: string;
  onQueryChange: (query: string) => void;
  placeholder: string;
  sections: PickerSection[];
  selected: Set<string>;
  onToggle: (value: string) => void;
  /** Shown when there is no data at all. */
  emptyLabel: ReactNode;
  /** Shown when a query filters everything out. */
  noMatchLabel?: ReactNode;
}

/** Scaffold for filter bodies with live-data options: a search input over a scrollable list of checkbox rows. */
export function LivePicker({
  query,
  onQueryChange,
  placeholder,
  sections,
  selected,
  onToggle,
  emptyLabel,
  noMatchLabel = "No matches.",
}: LivePickerProps) {
  const total = sections.reduce((n, section) => n + section.items.length, 0);

  return (
    <div className={styles.body} data-variant="scroll">
      <Menu.Input
        value={query}
        placeholder={placeholder}
        autoFocus
        onChange={(e) => onQueryChange(e.target.value)}
      />
      {total === 0 ? (
        <div className={styles.empty}>
          {query.trim() ? noMatchLabel : emptyLabel}
        </div>
      ) : (
        sections.map((section) => (
          <Fragment key={section.key}>
            {section.label != null ? (
              <div className={styles["section-header"]}>
                {section.icon}
                <span>{section.label}</span>
              </div>
            ) : null}
            {section.items.map((item) => {
              const checked = selected.has(item.value);
              return (
                <Menu.CheckboxItem
                  key={`${section.key}:${item.value}`}
                  closeOnClick={false}
                  checked={checked}
                  onCheckedChange={() => onToggle(item.value)}
                >
                  <Menu.CheckboxItemIndicator />
                  {item.flag}
                  <Menu.ItemLabel>{item.label ?? item.value}</Menu.ItemLabel>
                  {item.count != null ? (
                    <Menu.SecondaryLabel className={styles.count}>
                      {item.count}
                    </Menu.SecondaryLabel>
                  ) : null}
                </Menu.CheckboxItem>
              );
            })}
          </Fragment>
        ))
      )}
    </div>
  );
}

/** Normalise a predicate value (scalar/list/empty) into the membership set the picker checks against. */
export function useSelectionSet(value: unknown): Set<string> {
  return useMemo(() => {
    if (Array.isArray(value)) return new Set(value.map(String));
    if (typeof value === "string" && value) return new Set([value]);
    return new Set<string>();
  }, [value]);
}
