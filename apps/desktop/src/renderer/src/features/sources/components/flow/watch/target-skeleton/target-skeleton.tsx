import styles from "./target-skeleton.module.css";

export function WatchTargetSkeleton() {
  return (
    <div className={styles.skeleton} aria-hidden="true">
      <div className={styles["skeleton-row"]}>
        <span className={styles["skeleton-circle"]} />
        <span className={styles["skeleton-bars"]}>
          <span className={styles["skeleton-bar"]} style={{ width: 120 }} />
          <span className={styles["skeleton-bar"]} style={{ width: 84 }} />
        </span>
      </div>
      <div className={styles["skeleton-row"]}>
        <span className={styles["skeleton-circle"]} />
        <span className={styles["skeleton-bars"]}>
          <span className={styles["skeleton-bar"]} style={{ width: 150 }} />
          <span className={styles["skeleton-bar"]} style={{ width: 96 }} />
        </span>
      </div>
    </div>
  );
}
