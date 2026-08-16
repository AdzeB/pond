import Image from "next/image";
import styles from "./save-thumb.module.css";

/** Desktop derives the badge from the primary file's extension (deriveTypeLabel); demo kinds map to their file types. */
const TYPE_LABELS: Record<string, string> = {
  image: "JPG",
  video: "MP4",
  post: "PNG",
};

/** Desktop renders PNG brand logos from its sources registry, not SVG icons. */
const SOURCE_LOGOS: Record<string, string> = {
  x: "/demo/logos/twitter.png",
  instagram: "/demo/logos/instagram.png",
  pinterest: "/demo/logos/pinterest.png",
  arena: "/demo/logos/arena.png",
  cosmos: "/demo/logos/cosmos.png",
  tiktok: "/demo/logos/tiktok.png",
  youtube: "/demo/logos/youtube.png",
  reddit: "/demo/logos/reddit.png",
  threads: "/demo/logos/threads.png",
};

export interface SaveThumbProps {
  seed: number;
  image: string;
  aspect?: number;
  kind?: string;
  source?: string;
  selected?: boolean;
  count?: number;
  title?: string;
  time?: string;
  mediaHeight?: number;
}

/** Static recreation of the desktop save card: contained media at 4px radius inside a 12px shell, badges on a 6px overlay inset, meta below. */
export function SaveThumb({
  image,
  aspect = 1,
  kind,
  source,
  selected,
  count,
  title,
  time,
  mediaHeight,
}: SaveThumbProps) {
  const typeLabel = kind ? TYPE_LABELS[kind] : undefined;
  const sourceLogo = source ? SOURCE_LOGOS[source] : undefined;

  return (
    <div
      className={styles.item}
      data-selected={selected || undefined}
      aria-hidden
    >
      <div
        className={styles.media}
        style={
          mediaHeight
            ? { height: mediaHeight }
            : { aspectRatio: String(aspect) }
        }
      >
        <div className={styles.thumb}>
          <Image
            className={styles.image}
            src={image}
            alt=""
            width={480}
            height={Math.round(480 / aspect)}
          />
        </div>
        <div className={styles.overlay}>
          {typeLabel ? <span className={styles.type}>{typeLabel}</span> : null}
          {count ? <span className={styles.count}>{count}</span> : null}
          {sourceLogo ? (
            <span className={styles.source}>
              <Image src={sourceLogo} alt="" width={18} height={18} />
            </span>
          ) : null}
        </div>
      </div>
      {title || time ? (
        <div className={styles.meta}>
          {title ? <span className={styles.title}>{title}</span> : null}
          {time ? <span className={styles.time}>{time}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
