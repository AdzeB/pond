import { Shell } from "@/components/shell";
import styles from "./styles.module.css";

function Page() {
  return (
    <Shell.Main>
      <div className={styles.page}>
        <h1 className={styles.title}>Sync</h1>
        <p className={styles.placeholder}>
          Coming together. Sections will land next.
        </p>
      </div>
    </Shell.Main>
  );
}

export const Sync = { Page };
