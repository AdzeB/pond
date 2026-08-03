import { PlayIcon } from "@/components/tweet/card/icons";
import type { TweetCardMedia } from "@/components/tweet/card/lib/data";
import { formatDuration } from "@/lib/util/format";
import styles from "./styles.module.css";

/** Twitter caps a tweet at four media tiles; extra items are dropped. */
const MAX_TILES = 4;

/** Twitter's timeline window clamps a single video between 9:16 and 16:9, so wider or taller videos letterbox instead of stretching the card. */
const VIDEO_MIN_RATIO = 9 / 16;
const VIDEO_MAX_RATIO = 16 / 9;

function singleRatio(m: TweetCardMedia): string | undefined {
  if (!m.width || !m.height) return undefined;
  if (m.type === "video") {
    const clamped = Math.min(
      VIDEO_MAX_RATIO,
      Math.max(VIDEO_MIN_RATIO, m.width / m.height),
    );
    return String(clamped);
  }
  return `${m.width} / ${m.height}`;
}

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
  const single = count === 1 ? tiles[0] : undefined;
  const ratio = single ? singleRatio(single) : undefined;
  const singleVideo = single?.type === "video";

  return (
    <div
      className={styles["media-grid"]}
      data-count={count}
      data-compact={compact ? "true" : undefined}
      data-single-video={singleVideo ? "true" : undefined}
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
  /** In a 3-tile grid the first image spans the full left column. */
  const span = count === 3 && index === 0;
  return (
    <div className={styles["media-tile"]} data-span={span ? "true" : undefined}>
      {src ? (
        <img
          src={src}
          alt={media.altText ?? ""}
          className={styles["media-image"]}
          draggable={false}
        />
      ) : (
        <div className={styles["media-placeholder"]} aria-hidden />
      )}
      {media.type === "video" ? (
        <>
          <span className={styles["play-badge"]} aria-hidden>
            <PlayIcon width={22} height={22} />
          </span>
          {typeof media.durationSec === "number" ? (
            <span className={styles["duration-badge"]}>
              {formatDuration(media.durationSec)}
            </span>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
