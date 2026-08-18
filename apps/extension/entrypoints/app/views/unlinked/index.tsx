import { PopupShell } from "../shell";
import styles from "./styles.module.css";

export function UnlinkedView() {
  return (
    <PopupShell>
      <div className={styles.heading}>
        <h1 className={styles.title}>Not linked</h1>
        <p className={styles.subtitle}>
          Open the Pond toolbar on this page and paste a pairing token from the
          menu bar.
        </p>
      </div>
    </PopupShell>
  );
}
