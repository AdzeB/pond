import { PopupShell } from "../shell";
import styles from "./styles.module.css";

export function LoadingView() {
  return (
    <PopupShell>
      <p className={styles.message}>Linking with Pond</p>
    </PopupShell>
  );
}
