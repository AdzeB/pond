import { Loader, Settings } from "@pond/ui";
import styles from "./styles.module.css";

export function ModelsLoading() {
  return (
    <section
      className={styles.root}
      aria-busy="true"
      aria-label="Loading models"
    >
      <Loader.Root className={styles.status}>Loading models</Loader.Root>
      <div className={styles.toolbar} aria-hidden="true">
        <span className={styles.bone} data-part="search" />
        <span className={styles.bone} data-part="action" />
        <span className={styles.bone} data-part="action" />
      </div>
      {[0, 1].map((group) => (
        <div key={group} aria-hidden="true">
          <div className={styles.header}>
            <span className={styles.bone} data-part="logo" />
            <span className={styles.bone} data-part="provider" />
          </div>
          <Settings.List>
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className={styles.row}>
                <span className={styles.bone} data-part="name" />
                <span className={styles.bone} data-part="metric" />
                <span className={styles.bone} data-part="metric" />
                <span className={styles.bone} data-part="metric" />
                <span className={styles.bone} data-part="check" />
              </div>
            ))}
          </Settings.List>
        </div>
      ))}
    </section>
  );
}
