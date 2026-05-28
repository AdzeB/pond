import { Shell } from "@/components/shell";
import { Header } from "./header";
import { History } from "./history";
import { RightNow } from "./right-now";
import { Schedule } from "./schedule";
import { Sources } from "./sources";
import { Stats } from "./stats";
import styles from "./styles.module.css";

export function SyncPage() {
  return (
    <Shell.Main>
      <div className={styles.page}>
        <Header />
        <Stats />
        <RightNow />
        <div className={styles.split}>
          <div className={styles["split-main"]}>
            <Sources />
          </div>
          <div className={styles["split-side"]}>
            <Schedule />
          </div>
        </div>
        <History />
      </div>
    </Shell.Main>
  );
}

export const Sync = { Page: SyncPage };
