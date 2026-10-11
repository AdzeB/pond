import { IconXmarkOutline18 } from "@pond/icons/outline/18";
import type { ReactNode } from "react";
import styles from "./styles.module.css";

export function PaneHeader({ children }: { children: ReactNode }) {
  return (
    <div className={styles["pane-header"]}>
      {children}
      <IconXmarkOutline18 />
    </div>
  );
}
