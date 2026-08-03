import type { ReactNode } from "react";
import styles from "./styles.module.css";

export function PopupShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <img
            className={styles.mark}
            src="/icons/brand/icon.svg"
            alt=""
            width={22}
            height={22}
          />
          <span>Pond</span>
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
