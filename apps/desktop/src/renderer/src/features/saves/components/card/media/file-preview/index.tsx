import styles from "./styles.module.css";

export function FilePreview({ label }: { label: string }) {
  return (
    <div className={styles["file-preview"]} aria-hidden>
      <span>{label}</span>
    </div>
  );
}
