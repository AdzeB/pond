import { Header } from "@/components/threads/card/header";
import { ThreadsMedia } from "@/components/threads/card/media";
import { Metrics } from "@/components/threads/card/metrics";
import { QuotedCard } from "@/components/threads/card/quoted";
import { Body } from "@/components/tweet/card/body";
import type { TweetCardData } from "@/components/tweet/card/lib/data";
import { LinkCard } from "@/components/tweet/card/link-card";
import { formatTimestampLine } from "@/lib/util/format";
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
