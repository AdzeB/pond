import { Button } from "@pond/ui";
import { dockMode } from "@/stores/dock-mode";
import styles from "./styles.module.css";

export function WelcomeEmpty() {
  return (
    <div className={styles.welcome}>
      <div className={styles.copy}>
        <h2 className={styles.title}>Nothing here yet</h2>
        <p className={styles.text}>
          Drop a link, image, or file anywhere in the window. Or connect a
          source to sync the bookmarks you already have.
        </p>
      </div>
      <div className={styles.actions}>
        <Button
          variant="accent"
          size="md"
          onClick={() => dockMode.open("source-new")}
        >
          Connect a source
        </Button>
      </div>
      <p className={styles.hint}>You can also paste a URL with ⌘V</p>
    </div>
  );
}

/** Shown on the sources page when no accounts or watches exist yet. */
export function SourcesEmpty() {
  return (
    <div className={styles.welcome}>
      <div className={styles.copy}>
        <h2 className={styles.title}>No sources yet</h2>
        <p className={styles.text}>
          Connect a source or watch a public account. Pond keeps your library
          filling up in the background.
        </p>
      </div>
      <div className={styles.actions}>
        <Button
          variant="accent"
          size="md"
          onClick={() => dockMode.open("source-new")}
        >
          Connect a source
        </Button>
      </div>
    </div>
  );
}

/** Shown while the pool snapshot / first page is still resolving after a cold start. */
export function LibraryLoading() {
  return (
    <div className={styles.welcome} role="status" aria-live="polite">
      <div className={styles.spinner} aria-hidden="true" />
      <div className={styles.copy}>
        <h2 className={styles.title}>Loading library</h2>
        <p className={styles.text}>Getting your saves ready.</p>
      </div>
    </div>
  );
}
