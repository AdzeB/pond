import type { ReactNode } from "react";
import styles from "./styles.module.css";

interface AsideProps {
  side: "left" | "right";
  open: boolean;
  children: ReactNode;
}

export function Aside({ side, open, children }: AsideProps) {
  return (
    <div
      className={styles.collapse}
      data-side={side}
      data-open={open ? "true" : "false"}
      aria-hidden={!open || undefined}
    >
      <div className={styles.pane}>{children}</div>
    </div>
  );
}
