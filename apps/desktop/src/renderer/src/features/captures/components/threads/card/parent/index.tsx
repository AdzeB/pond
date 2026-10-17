import { MetaVerifiedIcon } from "@/features/captures/components/threads/card/icons";
import { ThreadsMedia } from "@/features/captures/components/threads/card/media";
import { Body } from "@/features/captures/components/tweet/card/body";
import { Avatar } from "@/features/captures/components/tweet/card/header";
import type { TweetCardData } from "@/features/captures/components/tweet/card/lib/data";
import styles from "./styles.module.css";

export function ParentPost({ data }: { data: TweetCardData }) {
  const { author, text, media } = data;
  const username = author.handle || author.name;
  return (
    <div className={styles.parent}>
      <div className={styles.rail}>
        <Avatar author={author} size={36} />
        <span className={styles.line} aria-hidden />
      </div>
      <div className={styles.content}>
        <span className={styles.name}>
          {username}
          {author.verified ? (
            <MetaVerifiedIcon
              className={styles.verified}
              width={16}
              height={16}
            />
          ) : null}
        </span>
        {text ? (
          <Body text={text} lang={data.lang} className={styles.text} />
        ) : null}
        {media && media.length > 0 ? <ThreadsMedia media={media} /> : null}
      </div>
    </div>
  );
}
