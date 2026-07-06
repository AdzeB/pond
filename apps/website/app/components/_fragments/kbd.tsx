import type { ReactNode } from "react";
import styles from "./fragments.module.css";

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className={styles.keyboard}>{children}</kbd>;
}

export function KbdCluster({ keys }: { keys: string[] }) {
  return (
    <span className={styles["keyboard-cluster"]}>
      {keys.map((key) => (
        <Kbd key={key}>{key}</Kbd>
      ))}
    </span>
  );
}
