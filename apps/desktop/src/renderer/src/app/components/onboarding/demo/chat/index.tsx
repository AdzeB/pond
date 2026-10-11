import { PaneHeader } from "../pane-header";
import styles from "./styles.module.css";

export function Chat() {
  return (
    <div className={styles.chat}>
      <PaneHeader>
        <span className={styles["pane-title"]}>Assistant</span>
      </PaneHeader>
      <div className={styles.thread}>
        <span className={styles.ask}>Show me beach photos</span>
        <span className={styles.reply}>Here's one from your library.</span>
        <span className={styles.attachment}>
          <span className={styles.thumb} />
          <span className={styles.caption}>
            <span className={styles.name}>Sunset over the bay</span>
            <span className={styles.meta}>Photography</span>
          </span>
        </span>
      </div>
    </div>
  );
}
