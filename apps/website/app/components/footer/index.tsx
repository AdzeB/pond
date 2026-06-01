import { Wordmark } from "../_fragments/mark";
import styles from "./styles.module.css";

const NOW = new Date().getFullYear();

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <Wordmark size={13} />
          <p className={styles.tagline}>
            A local-first archive for the open web.
          </p>
        </div>
        <nav className={styles.columns} aria-label="Footer">
          <div className={styles.column}>
            <p className={styles["column-label"]}>Get</p>
            <a className={styles.link} href="#download">
              Download
            </a>
            <a
              className={styles.link}
              href="https://github.com/raphaelsalaja/pond/releases"
              target="_blank"
              rel="noreferrer"
            >
              Releases
            </a>
          </div>
          <div className={styles.column}>
            <p className={styles["column-label"]}>Project</p>
            <a
              className={styles.link}
              href="https://github.com/raphaelsalaja/pond"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
            <a
              className={styles.link}
              href="https://github.com/raphaelsalaja/pond/security"
              target="_blank"
              rel="noreferrer"
            >
              Security
            </a>
            <a
              className={styles.link}
              href="https://github.com/raphaelsalaja/pond/blob/main/LICENSE"
              target="_blank"
              rel="noreferrer"
            >
              License
            </a>
          </div>
          <div className={styles.column}>
            <p className={styles["column-label"]}>Build</p>
            <span className={styles.version}>v0.1.0</span>
            <span className={styles.muted}>{NOW}, MIT</span>
          </div>
        </nav>
      </div>
    </footer>
  );
}
