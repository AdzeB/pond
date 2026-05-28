import { Shell } from "@/components/shell";
import { Header } from "./header";
import { History } from "./history";
import { RightNow } from "./right-now";
import { Schedule } from "./schedule";
import { Sources } from "./sources";
import styles from "./styles.module.css";

function Page() {
  return (
    <Shell.Main>
      <div className={styles.page}>
        <Header />
        <RightNow />
        <Sources />
        <Schedule />
        <History />
      </div>
    </Shell.Main>
  );
}

export const Sync = { Page };
