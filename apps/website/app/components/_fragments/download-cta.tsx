import {
  dmgUrl,
  extensionZipUrl,
  POND_VERSION,
  RELEASES_PAGE,
} from "@/lib/release";
import styles from "./download-cta.module.css";

interface DownloadCtaProps {
  /** Compact row for the hero; full stack for the Get section. */
  variant?: "hero" | "get";
}

export function DownloadCta({ variant = "hero" }: DownloadCtaProps) {
  return (
    <div className={styles.root} data-variant={variant}>
      <div className={styles.row}>
        <a className={styles.primary} href={dmgUrl("arm64")}>
          Download for Apple Silicon
        </a>
        <a className={styles.secondary} href={dmgUrl("x64")}>
          Intel
        </a>
      </div>
      <p className={styles.meta}>
        macOS 12 or later · v{POND_VERSION} ·{" "}
        <a href={extensionZipUrl()}>Chrome extension zip</a>
        {" · "}
        <a href={RELEASES_PAGE} target="_blank" rel="noreferrer">
          All releases
        </a>
      </p>
    </div>
  );
}
