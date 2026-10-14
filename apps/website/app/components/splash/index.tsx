import { Logo } from "@pond/ui/logo";
import type { CSSProperties } from "react";
import styles from "./styles.module.css";

/** Stacked copies at increasing depth give the flat mark an extruded edge while it flips. */
const LAYERS = [0, 1, 2, 3, 4, 5, 6, 7];

export function Splash() {
  return (
    <div className={styles.splash} aria-hidden>
      <div className={styles.mark}>
        <div className={styles.spin}>
          {LAYERS.map((depth) => (
            <Logo
              key={depth}
              className={styles.layer}
              size={48}
              aria-hidden
              style={
                /** SAFETY: React forwards custom properties, but `CSSProperties` has no `--*` keys. */
                { "--depth": depth } as CSSProperties
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
