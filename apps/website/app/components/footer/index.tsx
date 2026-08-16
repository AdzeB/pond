import { POND_VERSION } from "@/lib/release";
import styles from "./styles.module.css";

const NOW = new Date().getFullYear();

export function Footer() {
  return (
    <footer className={styles.footer}>
      <p className={styles.legal}>
        v{POND_VERSION} · © {NOW} Pond. MIT licensed.
      </p>
    </footer>
  );
}
