import type { LibraryCardView } from "@/features/saves/components/card/types";
import styles from "./styles.module.css";

export function ArchiveCardPreview({ view }: { view?: LibraryCardView }) {
  return (
    <div className={styles.archive} data-view={view}>
      <svg className={styles.icon} viewBox="0 0 64 80" aria-hidden>
        <title>Archive</title>
        <path className={styles.page} d="M9 2h29l17 17v56H9z" />
        <path className={styles.fold} d="M38 2v17h17" />
        <path
          className={styles.zip}
          d="M29 7h7v6h-7zm7 6h7v6h-7zm-7 6h7v6h-7zm7 6h7v6h-7zm-7 6h7v6h-7zm7 6h7v6h-7z"
        />
        <path className={styles.pull} d="M31 43h10v12H31z" />
      </svg>
    </div>
  );
}
