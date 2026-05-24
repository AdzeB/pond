import styles from "./fragments.module.css";

export interface FilterChip {
  label: string;
  count?: number;
  active?: boolean;
}

interface FilterBarProps {
  chips: FilterChip[];
  total?: number;
}

export function FilterBar({ chips, total }: FilterBarProps) {
  return (
    <div className={styles["filter-bar"]}>
      <div className={styles["filter-bar-chips"]}>
        {chips.map((chip) => (
          <span
            key={chip.label}
            className={styles["filter-chip"]}
            data-active={chip.active ? "" : undefined}
          >
            <span>{chip.label}</span>
            {chip.count != null ? (
              <span className={styles["filter-chip-count"]}>{chip.count}</span>
            ) : null}
          </span>
        ))}
      </div>
      {total != null ? (
        <span className={styles["filter-bar-total"]}>{total} saves</span>
      ) : null}
    </div>
  );
}
