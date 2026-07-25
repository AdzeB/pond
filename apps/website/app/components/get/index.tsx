import { DownloadCta } from "../_fragments/download-cta";
import { Section } from "../_primitives/section";
import styles from "./styles.module.css";

export function Get() {
  return (
    <Section.Root id="get">
      <div className={styles.stack}>
        <h2 className={styles.title}>Your pond is waiting.</h2>
        <p className={styles.lead}>
          Free and open source. macOS 12 or later, Apple Silicon and Intel. Drag
          the app to Applications, then load the extension from the release zip.
        </p>
        <div className={styles.form} id="updates">
          <DownloadCta variant="get" />
        </div>
        <p className={styles.meta}>
          Builds ship unsigned for now. Right-click Pond.app and choose Open on
          first launch.
        </p>
      </div>
    </Section.Root>
  );
}
