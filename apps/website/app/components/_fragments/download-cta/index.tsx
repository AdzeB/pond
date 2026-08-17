import {
  dmgUrl,
  extensionZipUrl,
  POND_VERSION,
  RELEASES_PAGE,
} from "@/lib/release";
import { LinkButton } from "../link-button";
import styles from "./styles.module.css";

interface DownloadCtaProps {
  /** Compact row for the hero; full stack for the footer. */
  variant?: "hero" | "get";
}

export function DownloadCta({ variant = "hero" }: DownloadCtaProps) {
  return (
    <div className={styles.root} data-variant={variant}>
      <div className={styles.row}>
        <LinkButton href={dmgUrl("arm64")} variant="primary" size="md">
          Download for Apple Silicon
        </LinkButton>
        <LinkButton href={dmgUrl("x64")} variant="ghost" size="md">
          Intel
        </LinkButton>
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
