import type { ReactNode } from "react";
import styles from "./fragments.module.css";

interface InspectorFieldProps {
  label: string;
  children: ReactNode;
  mono?: boolean;
}

export function InspectorField({ label, children, mono }: InspectorFieldProps) {
  return (
    <div className={styles["inspector-field"]}>
      <dt className={styles["inspector-label"]}>{label}</dt>
      <dd
        className={styles["inspector-value"]}
        data-mono={mono ? "" : undefined}
      >
        {children}
      </dd>
    </div>
  );
}

export function Inspector({ children }: { children: ReactNode }) {
  return <dl className={styles.inspector}>{children}</dl>;
}
