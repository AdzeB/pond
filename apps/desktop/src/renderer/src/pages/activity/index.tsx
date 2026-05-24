import { ActivityList } from "@/components/capture/activity-list";
import { Shell } from "@/components/shell";
import styles from "./styles.module.css";

export function ActivityPage() {
  return (
    <Shell.Main>
      <div className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.title}>Activity</h1>
          <p className={styles.subtitle}>
            Recent changes across the library: saves you've made, tags you've
            renamed, AI suggestions that were applied.
          </p>
        </header>
        <ActivityList.Root saveId={null} limit={200} />
      </div>
    </Shell.Main>
  );
}
