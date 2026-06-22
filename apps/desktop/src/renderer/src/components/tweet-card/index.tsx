import { Body } from "./body";
import type { TweetCardData } from "./data";
import { Header } from "./header";
import { MediaGrid } from "./media-grid";
import { Metrics } from "./metrics";
import { QuotedCard } from "./quoted-card";
import styles from "./styles.module.css";

export type { TweetCardData } from "./data";
export { toTweetCardData } from "./data";

type Scheme = "light" | "dark";

// Format the timestamp the way a tweet's detail view does: "h:mm AM · MMM D, YYYY".
function formatTimestamp(iso: string): string | null {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  const time = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  const date = d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${time} \u00b7 ${date}`;
}

export function TweetCard({
  data,
  scheme = "light",
}: {
  data: TweetCardData;
  scheme?: Scheme;
}) {
  const { author, text, media, metrics, quoted, publishedAt, isReply } = data;
  const timestamp = publishedAt ? formatTimestamp(publishedAt) : null;

  return (
    <article className={styles.card} data-scheme={scheme}>
      <Header author={author} />

      {isReply && data.replyingTo ? (
        <p className={styles.replyContext}>
          Replying to <span className={styles.entity}>@{data.replyingTo}</span>
        </p>
      ) : null}

      {text ? <Body text={text} lang={data.lang} /> : null}

      {media && media.length > 0 ? <MediaGrid media={media} /> : null}

      {quoted ? <QuotedCard data={quoted} /> : null}

      {timestamp ? <p className={styles.timestamp}>{timestamp}</p> : null}

      {metrics ? <Metrics metrics={metrics} /> : null}
    </article>
  );
}
