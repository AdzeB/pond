import { useActivityEntries } from "@/stores/activity";
import { ActivityRow } from "../activity-row";
import styles from "./styles.module.css";

/** Persistent record of background jobs and their failures; the dock pill is the ambient half. */
export function ActivityCard() {
  const entries = useActivityEntries();
  if (entries.length === 0) return null;
  return (
    <div className={styles.card}>
      <div className={styles["card-header"]}>
        <span className={styles["card-title"]}>Background tasks</span>
      </div>
      <ul className={styles.list}>
        {entries.map((entry) => (
          <ActivityRow key={entry.id} entry={entry} />
        ))}
      </ul>
    </div>
  );
}
