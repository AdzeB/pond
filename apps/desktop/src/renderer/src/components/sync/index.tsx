import { Shell } from "@/components/shell";
import { Header } from "./header";
import { Schedule } from "./schedule";
import styles from "./styles.module.css";

function Page() {
  return (
    <Shell.Main>
      <div className={styles.page}>
        <Header />
        <Schedule />
      </div>
    </Shell.Main>
  );
}

export const Sync = { Page };
