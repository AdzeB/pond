import type { ReactNode } from "react";
import styles from "./styles.module.css";

/** When `changed` is set, a dot trails the title so a non-default group reads at a glance. */
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
      <header className={styles["group-header"]}>
        <span className={styles["group-title"]}>
          {title}
          {changed ? (
            <span className={styles["group-dot"]} aria-hidden />
          ) : null}
        </span>
        {value != null ? (
          <span className={styles["group-value"]}>{value}</span>
        ) : null}
      </header>
      {children}
    </section>
  );
}
