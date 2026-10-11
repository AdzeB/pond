import type { TweetCardLink } from "@/features/captures/components/tweet/card/lib/data";
import styles from "./styles.module.css";

export function LinkCard({ data }: { data: TweetCardLink }) {
  const { domain, title, description, imageUrl, large } = data;

  if (large && imageUrl) {
    return (
      <div className={styles["link-card"]} data-large="true">
        <div className={styles.media}>
          <img
            src={imageUrl}
            alt=""
            className={styles.image}
            draggable={false}
            decoding="sync"
            referrerPolicy="no-referrer"
          />
          {title ? (
            <span className={styles["overlay-title"]}>{title}</span>
          ) : null}
        </div>
        {domain ? (
          <span className={styles["domain-below"]}>From {domain}</span>
        ) : null}
      </div>
    );
  }

  return (
    <div className={styles["link-card"]}>
      {imageUrl ? (
        <div className={styles.media}>
          <img
            src={imageUrl}
            alt=""
            className={styles.image}
            draggable={false}
            decoding="sync"
            referrerPolicy="no-referrer"
          />
        </div>
      ) : null}
      <div className={styles.detail}>
        {domain ? <span className={styles.domain}>{domain}</span> : null}
        {title ? <span className={styles.title}>{title}</span> : null}
        {description ? (
          <span className={styles.description}>{description}</span>
        ) : null}
      </div>
    </div>
  );
}
