import { IconGithub } from "@pond/icons/social-media";
import { Wordmark } from "../_fragments/mark";
import styles from "./styles.module.css";

export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <a href="#top" className={styles.brand} aria-label="Pond, back to top">
          <Wordmark size={14} />
        </a>
        <nav className={styles.nav} aria-label="Primary">
          <a className={styles["nav-link"]} href="#download">
            Download
          </a>
          <a
            className={styles["nav-link"]}
            href="https://github.com/raphaelsalaja/pond"
            target="_blank"
            rel="noreferrer"
          >
            <IconGithub width={14} height={14} fill="currentColor" />
            <span>GitHub</span>
          </a>
        </nav>
      </div>
    </header>
  );
}
