import type { ReactNode } from "react";
import styles from "./styles.module.css";

// A labelled section of the view-options panel: an uppercase title with an
// optional right-aligned readout of the current value (e.g. the Zoom step).
// When `changed` is set, a small dot trails the title so a non-default group
// reads at a glance (pairs with the panel's Reset).
export function Group({
  title,
  value,
  changed = false,
  children,
}: {
  title: string;
  value?: ReactNode;
  changed?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={styles.group}>
      <header className={styles.groupHeader}>
        <span className={styles.groupTitle}>
          {title}
          {changed ? <span className={styles.groupDot} aria-hidden /> : null}
        </span>
        {value != null ? (
          <span className={styles.groupValue}>{value}</span>
        ) : null}
      </header>
      {children}
    </section>
  );
}
