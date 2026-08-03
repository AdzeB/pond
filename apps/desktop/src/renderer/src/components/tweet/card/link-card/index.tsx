import type { TweetCardLink } from "@/components/tweet/card/lib/data";
import styles from "./styles.module.css";

/** X renders two OG-preview shapes: summary_large_image is a full-width image with overlaid title, summary is a bordered thumbnail row. */
export function LinkCard({ data }: { data: TweetCardLink }) {
  const { domain, title, description, imageUrl, large } = data;

  if (large && imageUrl) {
    return (
      <div className={styles["link-card"]} data-large="true">
        <div className={styles["link-card-media"]}>
          <img
            src={imageUrl}
            alt=""
            className={styles["link-card-image"]}
            draggable={false}
          />
          {title ? (
            <span className={styles["link-card-overlay-title"]}>{title}</span>
          ) : null}
        </div>
        {domain ? (
          <span className={styles["link-card-domain-below"]}>
            From {domain}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div className={styles["link-card"]}>
      {imageUrl ? (
        <div className={styles["link-card-media"]}>
          <img
            src={imageUrl}
            alt=""
            className={styles["link-card-image"]}
            draggable={false}
          />
        </div>
      ) : null}
      <div className={styles["link-card-detail"]}>
        {domain ? (
          <span className={styles["link-card-domain"]}>{domain}</span>
        ) : null}
        {title ? (
          <span className={styles["link-card-title"]}>{title}</span>
        ) : null}
        {description ? (
          <span className={styles["link-card-description"]}>{description}</span>
        ) : null}
      </div>
    </div>
  );
}
