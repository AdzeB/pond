import { IconGithub } from "@pond/icons/social-media";
import { POND_VERSION } from "@/lib/release";
import { DownloadCta } from "../_fragments/download-cta";
import { AppWindow } from "../_mocks/app-window";
import styles from "./styles.module.css";

export function Hero() {
  return (
    <section id="top" className={styles.hero}>
      <div className={styles.inner}>
        <p className={styles.eyebrow}>
          v{POND_VERSION} · Mac · Open source · MIT
        </p>
        <h1 className={styles.title}>
          The web is a sea of information.
          <span className={styles["title-soft"]}>
            {" "}
            Everyone deserves their own pond.
          </span>
        </h1>
        <p className={styles.lead}>
          Pond is a local-first archive for everything you save. One library
          across X, Instagram, Pinterest, Are.na, Cosmos, TikTok, YouTube,
          Reddit, Threads, and any web article. On your Mac, owned by you.
        </p>
        <div className={styles.cta}>
          <DownloadCta variant="hero" />
          <a
            className={styles["github-link"]}
            href="https://github.com/raphaelsalaja/pond"
            target="_blank"
            rel="noreferrer"
          >
            <IconGithub width={14} height={14} fill="currentColor" />
            <span>View on GitHub</span>
          </a>
        </div>
      </div>
      <div className={styles.still} aria-hidden>
        <div className={styles.shot}>
          <div className={styles.canvas}>
            <AppWindow />
          </div>
        </div>
      </div>
    </section>
  );
}
