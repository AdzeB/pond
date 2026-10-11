import { dmgUrl } from "@/lib/release";
import { Cta } from "../_fragments/cta";
import { Wordmark } from "../_fragments/mark";
import { AppWindow } from "../_mocks/app-window";
import styles from "./styles.module.css";

export function Hero() {
  return (
    <section id="top" className={styles.hero}>
      <div className={styles.inner}>
        <a href="#top" className={styles.brand} aria-label="Pond">
          <Wordmark />
        </a>
        <p className={styles.tagline}>Your personal social media archiver</p>
        <div className={styles.cta}>
          <Cta href={dmgUrl("arm64")}>Download</Cta>
          <Cta
            href="https://github.com/raphaelsalaja/pond"
            variant="ghost"
            external
          >
            View Source
          </Cta>
          <p className={styles.soon}>
            <span>Windows, coming soon</span>
            <span>Linux, coming soon</span>
          </p>
        </div>
        <div className={styles.shot} aria-hidden>
          <div className={styles.canvas}>
            <AppWindow />
          </div>
        </div>
      </div>
    </section>
  );
}
