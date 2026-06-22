import { formatCount } from "@/lib/format";
import type { TweetCardMetrics } from "./data";
import {
  BookmarkIcon,
  LikeIcon,
  ReplyIcon,
  RetweetIcon,
  ViewsIcon,
} from "./icons";
import styles from "./styles.module.css";

export function Metrics({ metrics }: { metrics: TweetCardMetrics }) {
  const items: Array<{
    key: string;
    Icon: typeof ReplyIcon;
    value: number | undefined;
  }> = [
    { key: "replies", Icon: ReplyIcon, value: metrics.replies },
    { key: "retweets", Icon: RetweetIcon, value: metrics.retweets },
    { key: "likes", Icon: LikeIcon, value: metrics.likes },
    { key: "views", Icon: ViewsIcon, value: metrics.views },
    { key: "bookmarks", Icon: BookmarkIcon, value: metrics.bookmarks },
  ];

  const shown = items.filter((i) => typeof i.value === "number");
  if (shown.length === 0) return null;

  return (
    <div className={styles.metrics}>
      {shown.map(({ key, Icon, value }) => (
        <span key={key} className={styles.metric}>
          <Icon className={styles.metricIcon} width={18} height={18} />
          <span className={styles.metricValue}>{formatCount(value ?? 0)}</span>
        </span>
      ))}
    </div>
  );
}
