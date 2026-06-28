import type { ReactNode } from "react";
import styles from "./styles.module.css";

export function Section({
  icon,
  title,
  tight,
  children,
}: {
  icon: ReactNode;
  title: string;
  tight?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={styles.section} data-tight={tight ? "true" : undefined}>
      <div className={styles.sectionHead}>
        <span className={styles.sectionIcon} aria-hidden>
          {icon}
        </span>
        <h3 className={styles.sectionTitle}>{title}</h3>
      </div>
      {children}
    </section>
  );
}
