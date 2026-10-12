import {
  IconArrowLeft,
  IconBell,
  IconBookmark,
  IconBookmarkFill,
  IconChatBubble,
  IconChevronLeft,
  IconChevronRight,
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

const POST = sample("gm");
const AVATAR = sample("Ikebana");

const NAV = [
  { label: "Home", Icon: IconHouse },
  { label: "Explore", Icon: IconMagnifier },
  { label: "Notifications", Icon: IconBell },
  { label: "Bookmarks", Icon: IconBookmark },
  { label: "Profile", Icon: IconUser },
];

interface BrowserProps {
  t: number;
  open?: number;
  close?: number;
  /** When the bookmark is pressed. */
  press?: number;
}

/** An X post in the browser, bookmarked once, with Pond's extension confirming the copy. */
export function Browser({
  t,
  open = opens("save"),
  close = closes("save"),
  press = open + 1550,
}: BrowserProps) {
  const done = press + 60;
  const root = useRef<HTMLDivElement>(null);
  const target = useRef<HTMLSpanElement>(null);
  const mark = useLayout(
    () => {
      const el = root.current;
      const a = el?.getBoundingClientRect();
      const b = target.current?.getBoundingClientRect();
      if (!el || !a || !b) return { x: 0, y: 0 };
      const unscale = el.offsetWidth / a.width;
      return {
        x: (b.x - a.x + b.width / 2) * unscale,
        y: (b.y - a.y + b.height / 2) * unscale,
      };
    },
    { x: 0, y: 0 },
  );
  const w = lift(t, open, close);
  const saved = t >= done;
  const pop = ease.outQuint(progress(t, done, 450));
  const toast = ease.outQuint(progress(t, done + 120, 500));
  const badge = ease.outQuint(progress(t, done + 260, 450));
  const travel = ease.inOut(progress(t, press - 1050, 950));
  const away = ease.inOut(progress(t, done + 300, 700));
  const pressing = t >= press && t < press + 140;
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
          x.com/noaweiss/status/1822371048821
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
              <img alt="" src={cover(AVATAR.id)} className={styles.avatar} />
              <span className={styles.name}>Noa Weiss</span>
              <span className={styles.handle}>@noaweiss</span>
            </div>
            <p className={styles.text}>gm</p>
            <img alt="" src={cover(POST.id)} className={styles.media} />
            <p className={styles.meta}>
              8:52 AM · Aug 10, 2026 · <b>12.4K</b> Views
            </p>
            <footer className={styles.actions}>
              <span className={styles.action}>
                <IconChatBubble size={18} /> 24
              </span>
              <span className={styles.action}>
                <IconRefresh size={18} /> 31
              </span>
              <span className={styles.action}>
                <IconHeart size={18} /> 412
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
                {saved ? 59 : 58}
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
              <img alt="" src={cover(AVATAR.id)} className={styles.avatar} />
              <span className={styles.who}>
                <span className={styles.name}>Noa Weiss</span>
                <span className={styles.handle}>@noaweiss</span>
              </span>
              <span className={styles.follow}>Follow</span>
            </div>
            <p className={styles.bio}>Photos, mornings, small rooms.</p>
          </section>
        </aside>
      </div>
      <Cursor
        x={mix(860, mark.x, travel) + away * 70}
        y={mix(640, mark.y, travel) + away * 60}
        scale={pressing ? 0.86 : 1}
        opacity={clamp((t - press + 1150) / 200)}
      />
    </div>
  );
}
