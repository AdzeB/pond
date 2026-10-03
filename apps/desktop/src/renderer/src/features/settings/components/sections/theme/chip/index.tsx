import type { ThemeDef } from "@pond/schema/db";
import styles from "./styles.module.css";

export function ThemeChip({ def }: { def: ThemeDef }) {
  return (
    <span
      aria-hidden
      className={styles.chip}
      style={{ background: def.background, color: def.accent }}
    >
      Aa
    </span>
  );
}
