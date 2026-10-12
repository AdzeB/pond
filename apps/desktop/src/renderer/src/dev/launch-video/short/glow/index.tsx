import type { ReactNode } from "react";
import styles from "./styles.module.css";

interface GlowProps {
  /** 0 is plain ink, 1 is the full Pond gradient. */
  amount: number;
  children: ReactNode;
}

/** A word that fades from ink into the Pond gradient. */
export function Glow({ amount, children }: GlowProps) {
  return (
    <span className={styles.glow}>
      <span style={{ opacity: 1 - amount }}>{children}</span>
      <span aria-hidden className={styles.tint} style={{ opacity: amount }}>
        {children}
      </span>
    </span>
  );
}
