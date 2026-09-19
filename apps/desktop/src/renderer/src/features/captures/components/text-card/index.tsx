import type { TextCardData } from "@shared/text-card";
import styles from "./styles.module.css";

export function TextCard({
  data,
  scheme,
}: {
  data: TextCardData;
  scheme: "light" | "dark";
}) {
  return (
    <div className={styles.card} data-scheme={scheme}>
      <p className={styles.body}>{data.text}</p>
    </div>
  );
}
