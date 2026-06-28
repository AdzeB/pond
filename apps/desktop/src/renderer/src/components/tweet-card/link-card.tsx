import type { TweetCardLink } from "./data";
import styles from "./styles.module.css";

// The linked page's OG preview. X renders two shapes:
// - summary_large_image: a rounded full-width image with the title overlaid
//   bottom-left and the domain in muted text beneath it (no description).
// - summary: a bordered row — square thumbnail beside domain, title, and a
//   clamped description.
export function LinkCard({ data }: { data: TweetCardLink }) {
  const { domain, title, description, imageUrl, large } = data;

  if (large && imageUrl) {
    return (
      <div className={styles.linkCard} data-large="true">
        <div className={styles.linkCardMedia}>
          <img
            src={imageUrl}
            alt=""
            className={styles.linkCardImg}
            draggable={false}
          />
          {title ? (
            <span className={styles.linkCardOverlayTitle}>{title}</span>
          ) : null}
        </div>
        {domain ? (
          <span className={styles.linkCardDomainBelow}>From {domain}</span>
        ) : null}
      </div>
    );
  }

  return (
    <div className={styles.linkCard}>
      {imageUrl ? (
        <div className={styles.linkCardMedia}>
          <img
            src={imageUrl}
            alt=""
            className={styles.linkCardImg}
            draggable={false}
          />
        </div>
      ) : null}
      <div className={styles.linkCardDetail}>
        {domain ? (
          <span className={styles.linkCardDomain}>{domain}</span>
        ) : null}
        {title ? <span className={styles.linkCardTitle}>{title}</span> : null}
        {description ? (
          <span className={styles.linkCardDescription}>{description}</span>
        ) : null}
      </div>
    </div>
  );
}
