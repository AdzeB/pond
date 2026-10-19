import { Demo } from "../../demo";
import styles from "./styles.module.css";

export function Features() {
  return (
    <div className={styles.showcase}>
      <div className={styles.stage} aria-hidden>
        <Demo framing="whole" />
      </div>
    </div>
  );
}
