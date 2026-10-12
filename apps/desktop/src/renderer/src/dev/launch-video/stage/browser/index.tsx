import {
  IconArrowLeft,
  IconBookmark,
  IconBookmarkFill,
  IconChatBubble,
  IconChevronLeft,
  IconChevronRight,
  IconDots,
  IconHeart,
  IconHouse,
  IconMagnifier,
  IconRefresh,
  IconUpload,
  IconUser,
} from "@pond/icons";
import { IconXTwitterGlyph } from "@pond/icons/social-media";
import { Logo } from "@pond/ui/logo";
import { useRef } from "react";
import { Cursor } from "../cursor";
import { useLayout } from "../layout";
import { cover, sample } from "../media";
import { clamp, closes, ease, lift, mix, opens, progress } from "../timeline";
import styles from "./styles.module.css";

const POST = sample("Lancia Delta in snow");
const OPEN = opens("save");
const CLOSE = closes("save");
const PRESS = OPEN + 1550;
const SAVED = PRESS + 60;

const NAV = [
  { label: "Home", Icon: IconHouse },
  { label: "Explore", Icon: IconMagnifier },
  { label: "Bookmarks", Icon: IconBookmark },
  { label: "Profile", Icon: IconUser },
  { label: "More", Icon: IconDots },
];

/** An X post in the browser, bookmarked once, with Pond's extension confirming the copy. */
export function Browser({ t }: { t: number }) {
  const root = useRef<HTMLDivElement>(null);
  const target = useRef<HTMLSpanElement>(null);
  const mark = useLayout(
    () => {
      const a = root.current?.getBoundingClientRect();
      const b = target.current?.getBoundingClientRect();
      return a && b
        ? { x: b.x - a.x + b.width / 2, y: b.y - a.y + b.height / 2 }
        : { x: 0, y: 0 };
    },
    { x: 0, y: 0 },
  );
  const w = lift(t, OPEN, CLOSE);
  const saved = t >= SAVED;
  const pop = ease.outQuint(progress(t, SAVED, 450));
  const toast = ease.outQuint(progress(t, SAVED + 120, 500));
  const badge = ease.outQuint(progress(t, SAVED + 260, 450));
  const travel = ease.inOut(progress(t, OPEN + 500, 950));
  const away = ease.inOut(progress(t, SAVED + 300, 700));
  const pressing = t >= PRESS && t < PRESS + 140;
  return (
    <div
      ref={root}
      className={styles.window}
      style={{
        opacity: w.opacity,
        transform: `translateY(${w.dy}px)`,
        filter: w.blur > 0.05 ? `blur(${w.blur}px)` : undefined,
        visibility: w.opacity <= 0.002 ? "hidden" : undefined,
      }}
    >
      <header className={styles.toolbar}>
        <span className={styles.lights}>
          <i />
          <i />
          <i />
        </span>
        <span className={styles.history}>
          <IconChevronLeft size={18} />
          <IconChevronRight size={18} />
        </span>
        <span className={styles.address}>
          x.com/strada_archive/status/1844210931
        </span>
        <span className={styles.extension}>
          <Logo size={20} aria-hidden />
          <span
            className={styles.ok}
            style={{
              opacity: clamp(badge * 2),
              transform: `scale(${mix(0.4, 1, badge)})`,
            }}
          >
            ok
          </span>
        </span>
      </header>
      <div className={styles.page}>
        <nav className={styles.nav}>
          <IconXTwitterGlyph width={30} height={30} className={styles.x} />
          {NAV.map(({ label, Icon }) => (
            <span key={label} className={styles.link}>
              <Icon size={24} />
              {label}
            </span>
          ))}
        </nav>
        <main className={styles.main}>
          <div className={styles.heading}>
            <IconArrowLeft size={20} />
            Post
          </div>
          <article className={styles.post}>
            <div className={styles.author}>
              <span className={styles.avatar} />
              <span className={styles.name}>Strada Archive</span>
              <span className={styles.handle}>@strada_archive</span>
            </div>
            <p className={styles.text}>
              Delta Integrale, the morning after the first snow.
            </p>
            <img alt="" src={cover(POST.id)} className={styles.media} />
            <p className={styles.meta}>
              8:52 AM · Oct 9, 2026 · <b>12.4K</b> Views
            </p>
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
              <span
                ref={target}
                className={styles.action}
                data-saved={saved || undefined}
              >
                <span
                  className={styles.glyph}
                  style={{
                    transform: `scale(${saved ? mix(0.6, 1, pop) : 1})`,
                  }}
                >
                  {saved ? (
                    <IconBookmarkFill size={18} />
                  ) : (
                    <IconBookmark size={18} />
                  )}
                </span>
                {saved ? 60 : 59}
              </span>
              <span className={styles.action}>
                <IconUpload size={18} />
              </span>
            </footer>
          </article>
          <span
            className={styles.toast}
            style={{
              opacity: clamp(toast * 2),
              transform: `translate(-50%, ${(1 - toast) * 24}px)`,
            }}
          >
            Added to your Bookmarks
          </span>
        </main>
        <aside className={styles.rail}>
          <span className={styles.search}>
            <IconMagnifier size={16} />
            Search
          </span>
          <section className={styles.card}>
            <h3 className={styles.title}>Relevant people</h3>
            <div className={styles.person}>
              <span className={styles.avatar} />
              <span className={styles.who}>
                <span className={styles.name}>Strada Archive</span>
                <span className={styles.handle}>@strada_archive</span>
              </span>
              <span className={styles.follow}>Follow</span>
            </div>
            <p className={styles.bio}>Italian cars, photographed in winter.</p>
          </section>
        </aside>
      </div>
      <Cursor
        x={mix(860, mark.x, travel) + away * 70}
        y={mix(640, mark.y, travel) + away * 60}
        scale={pressing ? 0.86 : 1}
        opacity={clamp((t - OPEN - 400) / 200)}
      />
    </div>
  );
}
