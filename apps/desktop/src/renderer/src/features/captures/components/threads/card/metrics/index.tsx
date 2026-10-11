import {
  LikeIcon,
  ReplyIcon,
  RepostIcon,
  ShareIcon,
} from "@/features/captures/components/threads/card/icons";
import type { TweetCardMetrics } from "@/features/captures/components/tweet/card/lib/data";
import { formatCount } from "@/shared/lib/format";
import styles from "./styles.module.css";

export function Metrics({ metrics }: { metrics: TweetCardMetrics }) {
  const items: Array<{
    key: string;
    Icon: typeof LikeIcon;
    value: number | undefined;
  }> = [
    { key: "likes", Icon: LikeIcon, value: metrics.likes },
    { key: "replies", Icon: ReplyIcon, value: metrics.replies },
    { key: "retweets", Icon: RepostIcon, value: metrics.retweets },
    { key: "shares", Icon: ShareIcon, value: metrics.shares },
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
