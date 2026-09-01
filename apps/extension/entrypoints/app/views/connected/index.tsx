import { PopupShell } from "../shell";
import styles from "./styles.module.css";

export function ConnectedView({ libraryName }: { libraryName: string }) {
  return (
    <PopupShell>
      <div className={styles.heading}>
        <h1 className={styles.title}>{libraryName}</h1>
        <p className={styles.subtitle}>
          Pond is running. Click the Pond icon or right-click a page to save.
          When Pond asks to connect a source, stay signed in. Cookies are sent
          from Chrome even if that tab is in the background.
        </p>
      </div>
    </PopupShell>
  );
}
