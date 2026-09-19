import { Header } from "@/features/captures/components/threads/card/header";
import { ThreadsMedia } from "@/features/captures/components/threads/card/media";
import { Metrics } from "@/features/captures/components/threads/card/metrics";
import { QuotedCard } from "@/features/captures/components/threads/card/quoted";
import { Body } from "@/features/captures/components/tweet/card/body";
import type { TweetCardData } from "@/features/captures/components/tweet/card/lib/data";
import { LinkCard } from "@/features/captures/components/tweet/card/link-card";
import { formatTimestampLine } from "@/shared/lib/format";
import styles from "./styles.module.css";

type Scheme = "light" | "dark";

export function ThreadsCard({
  data,
  scheme = "light",
}: {
  data: TweetCardData;
  scheme?: Scheme;
}) {
  const { author, text, media, metrics, quoted, card, publishedAt, isReply } =
    data;
  const timestamp = formatTimestampLine(publishedAt);

  return (
    <article className={styles.card} data-scheme={scheme}>
      <Header author={author} />

      {isReply && data.replyingTo ? (
        <p className={styles["reply-context"]}>
          Replying to <span className={styles.entity}>@{data.replyingTo}</span>
        </p>
      ) : null}

      {text ? (
        <Body text={text} lang={data.lang} className={styles.caption} />
      ) : null}

      {media && media.length > 0 ? <ThreadsMedia media={media} /> : null}

      {quoted ? <QuotedCard data={quoted} /> : null}

      {card ? <LinkCard data={card} /> : null}

      {timestamp ? <p className={styles.timestamp}>{timestamp}</p> : null}

      {metrics ? <Metrics metrics={metrics} /> : null}
    </article>
  );
}
