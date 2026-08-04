import type { TextCardData } from "@shared/text-card";
import styles from "./styles.module.css";

/** Capture-only Are.na-style text block; rasterized to a cover PNG by the render-card window. */
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
