import {
  IconBookmark,
  IconBookmarkFill,
  IconChatBubble,
  IconHeart,
  IconRefresh,
  IconUpload,
} from "@pond/icons";
import { IconXTwitterGlyph } from "@pond/icons/social-media";
import { Logo } from "@pond/ui/logo";
import { Cursor } from "../cursor";
import { cover, LANCIA } from "../media";
import { BEATS, clamp, ease, mix, presence, progress } from "../timeline";
import styles from "./styles.module.css";

/** Card-space centre of the bookmark button; matches the fixed rows in the CSS. */
const BOOKMARK = { x: 485, y: 501 };

/** An X post saved with one bookmark, then Pond's notification. */
export function Post({ t }: { t: number }) {
  const opacity = presence(t, "save", 420, 320);
  if (opacity <= 0) return null;
  const start = BEATS.save[0];
  const rise = ease.out(progress(t, start, 700));
  const travel = ease.inOut(progress(t, start + 700, 1100));
  const away = ease.inOut(progress(t, start + 2200, 600));
  const press = progress(t, start + 1900, 140);
  const saved = t >= start + 1960;
  const pop = ease.settle(progress(t, start + 1960, 500));
  const notify = ease.settle(progress(t, start + 2300, 700));
  const pressScale = press > 0 && press < 1 ? 0.86 : 1;
  return (
    <div className={styles.scene} style={{ opacity }}>
      <article
        className={styles.post}
        style={{ transform: `translateY(${(1 - rise) * 40}px)` }}
      >
        <header className={styles.header}>
          <span className={styles.avatar} />
          <span className={styles.who}>
            <span className={styles.name}>Strada Archive</span>
            <span className={styles.handle}>@strada_archive · 2h</span>
          </span>
          <IconXTwitterGlyph width={20} height={20} className={styles.mark} />
        </header>
        <p className={styles.text}>
          Delta Integrale, the morning after the first snow.
        </p>
        <img alt="" src={cover(LANCIA)} className={styles.media} />
        <footer className={styles.actions}>
          <span className={styles.action}>
            <IconChatBubble size={18} /> 48
          </span>
          <span className={styles.action}>
            <IconRefresh size={18} /> 312
          </span>
          <span className={styles.action}>
            <IconHeart size={18} /> 4.1K
          </span>
          <span className={styles.spacer} />
          <span
            className={styles.action}
            data-saved={saved || undefined}
            style={{ transform: `scale(${saved ? 0.7 + 0.3 * pop : 1})` }}
          >
            {saved ? (
              <IconBookmarkFill size={18} />
            ) : (
              <IconBookmark size={18} />
            )}
          </span>
          <span className={styles.action}>
            <IconUpload size={18} />
          </span>
        </footer>
        <Cursor
          x={mix(760, BOOKMARK.x, travel) + away * 46}
          y={mix(720, BOOKMARK.y, travel) + away * 40}
          scale={pressScale}
          opacity={clamp((t - start - 500) / 200)}
        />
      </article>
      <aside
        className={styles.notification}
        style={{
          opacity: clamp(notify * 1.4),
          transform: `translateX(${(1 - notify) * 60}px)`,
        }}
      >
        <span className={styles.icon}>
          <Logo size={26} aria-hidden />
        </span>
        <span className={styles.body}>
          <span className={styles.title}>Pond</span>
          <span className={styles.detail}>Saved from X</span>
        </span>
        <img alt="" src={cover(LANCIA)} className={styles.thumb} />
      </aside>
    </div>
  );
}
