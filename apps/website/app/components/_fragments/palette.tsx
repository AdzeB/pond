import type { ReactNode } from "react";
import styles from "./fragments.module.css";
import { KbdCluster } from "./kbd";

interface PaletteRowProps {
  id?: string;
  icon?: ReactNode;
  label: ReactNode;
  hint?: string;
  keys?: string[];
  selected?: boolean;
}

export function PaletteRow({
  icon,
  label,
  hint,
  keys,
  selected,
}: PaletteRowProps) {
  return (
    <div
      className={styles["palette-row"]}
      data-selected={selected ? "" : undefined}
    >
      <div className={styles["palette-row-icon"]}>{icon}</div>
      <div className={styles["palette-row-body"]}>
        <span className={styles["palette-row-label"]}>{label}</span>
        {hint ? (
          <span className={styles["palette-row-hint"]}>{hint}</span>
        ) : null}
      </div>
      {keys ? <KbdCluster keys={keys} /> : null}
    </div>
  );
}

interface PaletteProps {
  query?: string;
  groups: { label: string; rows: (PaletteRowProps & { id: string })[] }[];
}

export function Palette({ query = "", groups }: PaletteProps) {
  return (
    <div className={styles.palette}>
      <div className={styles["palette-input"]}>
        <span className={styles["palette-input-caret"]} aria-hidden />
        <span className={styles["palette-input-text"]}>
          {query || (
            <span className={styles["palette-input-placeholder"]}>
              Type a command, search, or paste a link
            </span>
          )}
        </span>
      </div>
      <div className={styles["palette-body"]}>
        {groups.map((group) => (
          <div key={group.label} className={styles["palette-group"]}>
            <div className={styles["palette-group-label"]}>{group.label}</div>
            {group.rows.map((row) => (
              <PaletteRow key={row.id} {...row} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
