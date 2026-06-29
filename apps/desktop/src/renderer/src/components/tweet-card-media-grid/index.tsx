import type { TweetCardMedia } from "@/components/tweet-card/lib/data";
import { PlayIcon } from "@/components/tweet-card-icons";
import { formatDuration } from "@/lib/util/format";
import styles from "./styles.module.css";

// Twitter caps a tweet at four media tiles; extra items are dropped.
const MAX_TILES = 4;

export function MediaGrid({
  media,
  compact,
}: {
  media: TweetCardMedia[];
  compact?: boolean;
}) {
  const tiles = media.slice(0, MAX_TILES);
  if (tiles.length === 0) return null;

  const count = tiles.length;
  // A lone image keeps its natural aspect ratio; grids use Twitter's fixed frame.
  const single = count === 1 ? tiles[0] : undefined;
  const ratio =
    single?.width && single.height
      ? `${single.width} / ${single.height}`
      : undefined;

  return (
    <div
      className={styles.mediaGrid}
      data-count={count}
      data-compact={compact ? "true" : undefined}
      style={
        count === 1 && ratio
          ? ({ "--tweet-media-ratio": ratio } as React.CSSProperties)
          : undefined
      }
    >
      {tiles.map((m, i) => (
        <Tile key={m.url} media={m} index={i} count={count} />
      ))}
    </div>
  );
}

function Tile({
  media,
  index,
  count,
}: {
  media: TweetCardMedia;
  index: number;
  count: number;
}) {
  const src = media.type === "video" ? media.posterUrl : media.url;
  // In a 3-tile grid the first image spans the full left column.
  const span = count === 3 && index === 0;
  return (
    <div className={styles.mediaTile} data-span={span ? "true" : undefined}>
      {src ? (
        <img
          src={src}
          alt={media.altText ?? ""}
          className={styles.mediaImg}
          draggable={false}
        />
      ) : (
        <div className={styles.mediaPlaceholder} aria-hidden />
      )}
      {media.type === "video" ? (
        <>
          <span className={styles.playBadge} aria-hidden>
            <PlayIcon width={22} height={22} />
          </span>
          {typeof media.durationSec === "number" ? (
            <span className={styles.durationBadge}>
              {formatDuration(media.durationSec)}
            </span>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
