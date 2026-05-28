import { Shell } from "@/components/shell";
import { Header } from "./header";
import { Schedule } from "./schedule";
import { Sources } from "./sources";
import styles from "./styles.module.css";

function Page() {
  return (
    <Shell.Main>
      <div className={styles.page}>
        <Header />
        <Sources />
        <Schedule />
      </div>
    </Shell.Main>
  );
}

export const Sync = { Page };
