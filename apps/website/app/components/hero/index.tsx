import { IconGithub } from "@pond/icons/social-media";
import { JustifiedGrid } from "../_fragments/justified-grid";
import styles from "./styles.module.css";

export function Hero() {
  return (
    <section id="top" className={styles.hero}>
      <div className={styles.inner}>
        <p className={styles.eyebrow}>v0.1.0 · Mac-first · Open source</p>
        <h1 className={styles.title}>
          The web is a sea of information.
          <span className={styles["title-soft"]}>
            {" "}
            Everyone deserves their own pond.
          </span>
        </h1>
        <p className={styles.lead}>
          A local-first archive for everything you save across X, Instagram,
          Pinterest, Are.na, Cosmos, TikTok, YouTube, and any web article.
        </p>
        <div className={styles.cta}>
          <a
            className={`${styles.button} ${styles["button-primary"]}`}
            href="https://github.com/raphaelsalaja/pond/releases/latest"
          >
            <span>Download for Mac</span>
          </a>
          <a
            className={`${styles.button} ${styles["button-secondary"]}`}
            href="https://github.com/raphaelsalaja/pond"
            target="_blank"
            rel="noreferrer"
          >
            <IconGithub width={14} height={14} fill="currentColor" />
            <span>View on GitHub</span>
          </a>
        </div>
        <p className={styles.meta}>
          Free, MIT licensed. Requires macOS 12 or later.
        </p>
      </div>
      <div className={styles.still} aria-hidden>
        <div className={styles["still-mask"]}>
          <JustifiedGrid
            count={14}
            rowHeight={84}
            seedOffset={2}
            density="tight"
          />
        </div>
      </div>
    </section>
  );
}
