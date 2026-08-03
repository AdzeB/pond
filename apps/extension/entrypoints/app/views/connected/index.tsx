import { PopupShell } from "../shell";
import styles from "./styles.module.css";

export function ConnectedView({ libraryName }: { libraryName: string }) {
  return (
    <PopupShell>
      <div className={styles.heading}>
        <h1 className={styles.title}>{libraryName}</h1>
        <p className={styles.subtitle}>
          Linked. Capture runs in the background. When Pond asks to connect a
          source, open that site while signed in.
        </p>
      </div>
    </PopupShell>
  );
}
