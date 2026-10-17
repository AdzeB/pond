import { Body } from "@/features/captures/components/tweet/card/body";
import { Avatar } from "@/features/captures/components/tweet/card/header";
import { VerifiedIcon } from "@/features/captures/components/tweet/card/icons";
import type { TweetCardData } from "@/features/captures/components/tweet/card/lib/data";
import { MediaGrid } from "@/features/captures/components/tweet/card/media-grid";
import styles from "./styles.module.css";

export function ParentPost({ data }: { data: TweetCardData }) {
  const { author, text, media } = data;
  return (
    <div className={styles.parent}>
      <div className={styles.rail}>
        <Avatar author={author} />
        <span className={styles.line} aria-hidden />
      </div>
      <div className={styles.content}>
        <div className={styles.identity}>
          <span className={styles.name}>
            {author.name}
            {author.verified ? (
              <VerifiedIcon
                className={styles.verified}
                width={18}
                height={18}
              />
            ) : null}
          </span>
          <span className={styles.handle}>@{author.handle}</span>
        </div>
        {text ? (
          <Body text={text} lang={data.lang} className={styles.text} />
        ) : null}
        {media && media.length > 0 ? <MediaGrid media={media} /> : null}
      </div>
    </div>
  );
}
