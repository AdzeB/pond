import {
  BookmarkIcon,
  LikeIcon,
  ReplyIcon,
  RetweetIcon,
  ViewsIcon,
} from "@/features/captures/components/tweet/card/icons";
import type { TweetCardMetrics } from "@/features/captures/components/tweet/card/lib/data";
import { formatCount } from "@/shared/lib/format";
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

  const shown = items.filter((i) => i.value !== undefined);
  if (shown.length === 0) return null;

  return (
    <div className={styles.metrics}>
      {shown.map(({ key, Icon, value }) => (
        <span key={key} className={styles.metric}>
          <Icon className={styles["metric-icon"]} width={18} height={18} />
          <span className={styles["metric-value"]}>
            {formatCount(value ?? 0)}
          </span>
        </span>
      ))}
    </div>
  );
}
