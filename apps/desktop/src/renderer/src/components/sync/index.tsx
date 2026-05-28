import { Shell } from "@/components/shell";
import { Header } from "./header";
import styles from "./styles.module.css";

function Page() {
  return (
    <Shell.Main>
      <div className={styles.page}>
        <Header />
      </div>
    </Shell.Main>
  );
}

export const Sync = { Page };
