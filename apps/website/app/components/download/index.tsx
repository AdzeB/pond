import { IconApple, IconGithub } from "@pond/icons/social-media";
import { CopyBlock } from "../_fragments/copy-block";
import { Section } from "../_primitives/section";
import styles from "./styles.module.css";

export function Download() {
  return (
    <Section.Root id="download">
      <Section.Header>
        <Section.Eyebrow>Download</Section.Eyebrow>
        <Section.Title>Download Pond.</Section.Title>
        <Section.Lead>Mac-first. Open source. v0.1.0.</Section.Lead>
      </Section.Header>
      <div className={styles.card}>
        <CopyBlock command="brew install --cask pond" label="Copy" />
        <div className={styles.cta}>
          <a
            className={`${styles.button} ${styles["button-primary"]}`}
            href="https://github.com/raphaelsalaja/pond/releases/latest"
          >
            <IconApple width={14} height={14} fill="currentColor" />
            <span>Download .dmg</span>
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
          Requires macOS 12 or later. Apple Silicon and Intel.
        </p>
      </div>
    </Section.Root>
  );
}
