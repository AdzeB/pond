import { IconXmark } from "@pond/icons";
import type { ReactNode } from "react";
import styles from "./styles.module.css";

export function PaneHeader({ children }: { children: ReactNode }) {
  return (
    <div className={styles["pane-header"]}>
      {children}
      <IconXmark />
    </div>
  );
}
