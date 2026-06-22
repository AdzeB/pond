import type { TweetCardData } from "./data";
import { Avatar } from "./header";
import { VerifiedIcon } from "./icons";
import { MediaGrid } from "./media-grid";
import styles from "./styles.module.css";

// Compact nested rendering of a quoted tweet: inline header, clamped text, and
// at most a single media tile, matching X's embedded-quote treatment.
export function QuotedCard({ data }: { data: TweetCardData }) {
  const { author, text, media } = data;
  return (
    <div className={styles.quoted}>
      <div className={styles.quotedHeader}>
        <Avatar author={author} size={20} />
        <span className={styles.quotedName}>
          {author.name}
          {author.verified ? (
            <VerifiedIcon className={styles.verified} width={15} height={15} />
          ) : null}
        </span>
        <span className={styles.quotedHandle}>@{author.handle}</span>
      </div>
      {text ? <p className={styles.quotedBody}>{text}</p> : null}
      {media && media.length > 0 ? <MediaGrid media={media} compact /> : null}
    </div>
  );
}
