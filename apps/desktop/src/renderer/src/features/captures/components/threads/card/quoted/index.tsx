import { MetaVerifiedIcon } from "@/features/captures/components/threads/card/icons";
import { ThreadsMedia } from "@/features/captures/components/threads/card/media";
import { Avatar } from "@/features/captures/components/tweet/card/header";
import type { TweetCardData } from "@/features/captures/components/tweet/card/lib/data";
import styles from "./styles.module.css";

export function QuotedCard({ data }: { data: TweetCardData }) {
  const { author, text, media } = data;
  const username = author.handle || author.name;
  return (
    <div className={styles.quoted}>
      <div className={styles.header}>
        <Avatar author={author} size={22} />
        <span className={styles.name}>
          {username}
          {author.verified ? (
            <MetaVerifiedIcon
              className={styles.verified}
              width={14}
              height={14}
            />
          ) : null}
        </span>
      </div>
      {text ? <p className={styles.body}>{text}</p> : null}
      {media && media.length > 0 ? (
        <ThreadsMedia media={media} compact />
      ) : null}
    </div>
  );
}
