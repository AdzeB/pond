import styles from "./fragments.module.css";

export function ArchivedChip() {
  return (
    <span className={styles["archived-chip"]}>
      <span className={styles["archived-chip-dot"]} aria-hidden />
      Archived
    </span>
  );
}
