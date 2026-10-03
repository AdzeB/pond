import styles from "./styles.module.css";

export function TextPreview({ children }: { children: string }) {
  return (
    <div className={styles["text-preview"]}>
      <span className={styles["text-preview-body"]}>{children}</span>
    </div>
  );
}
