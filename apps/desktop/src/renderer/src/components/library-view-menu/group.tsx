import type { ReactNode } from "react";
import styles from "./styles.module.css";

// A labelled section of the view-options panel: an uppercase title with an
// optional right-aligned readout of the current value (e.g. the Zoom step).
export function Group({
  title,
  value,
  children,
}: {
  title: string;
  value?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={styles.group}>
      <header className={styles.groupHeader}>
        <span className={styles.groupTitle}>{title}</span>
        {value != null ? (
          <span className={styles.groupValue}>{value}</span>
        ) : null}
      </header>
      {children}
    </section>
  );
}
