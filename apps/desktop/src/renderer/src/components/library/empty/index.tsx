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
