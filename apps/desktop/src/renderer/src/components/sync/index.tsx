import { Activity } from "@/components/capture/activity";
import { Shell } from "@/components/shell";
import { Header } from "./header";
import { Hero } from "./hero";
import { RightNow } from "./right-now";
import { Sources } from "./sources";
import { Stats } from "./stats";
import styles from "./styles.module.css";

export function SyncPage() {
  return (
    <Shell.Main>
      <div className={styles.page}>
        <div className={styles["page-head"]}>
          <Header />
          <Stats />
        </div>
        <div className={styles.section}>
          <Hero />
        </div>
        <div className={styles.section}>
          <RightNow />
        </div>
        <div className={styles.section}>
          <Sources />
        </div>
        <div className={styles.section}>
          <Activity />
        </div>
      </div>
    </Shell.Main>
  );
}

export const Sync = { Page: SyncPage };
