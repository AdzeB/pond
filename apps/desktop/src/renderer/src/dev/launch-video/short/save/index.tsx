import {
  IconArrowLeft,
  IconBell,
  IconBookmark,
  IconBookmarkFill,
  IconChatBubble,
  IconCheck,
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
import { useRef } from "react";
import { Cursor, glide } from "../../stage/cursor";
import { cover, sample } from "../../stage/media";
import {
  clamp,
  ease,
  envelope,
  mix,
  progress,
  styled,
} from "../../stage/timeline";
import { lens, track, WHOLE } from "../camera";
import { Mac } from "../mac";
import { center, useBoxes } from "../measure";
import { Morph } from "../morph";
import { end, live, start } from "../timeline";
import styles from "./styles.module.css";

const POST = sample("gm");
const AVATAR = sample("Ikebana");

const WINDOW = { x: 200, y: 100 };
const BROWSER_WIDTH = 1520;
const S = start("save");
const PRESS = S + 1300;
const LIFT = PRESS + 120;
const FLY = PRESS + 300;
const LAND = PRESS + 950;
const EXIT = end("save") - 350;
const BURST = [0, 1, 2, 3, 4, 5, 6, 7];

const NAV = [
  { label: "Home", Icon: IconHouse },
  { label: "Explore", Icon: IconMagnifier },
  { label: "Notifications", Icon: IconBell },
  { label: "Bookmarks", Icon: IconBookmark },
  { label: "Profile", Icon: IconUser },
];

/** Bookmark a post on X; the photo flies into Pond's toolbar button, which spins and confirms. */
export function Save({ t }: { t: number }) {
  const win = useRef<HTMLDivElement>(null);
  const media = useRef<HTMLImageElement>(null);
  const mark = useRef<HTMLSpanElement>(null);
  const button = useRef<HTMLSpanElement>(null);
  const boxes = useBoxes(win, { media, mark, button });
  const ext = center(boxes.button);
  const target = center(boxes.mark);
  const view = track(t, [
    { at: S, ...WHOLE },
    { at: FLY, ...WHOLE, move: 1 },
    {
      at: LAND + 150,
      x: WINDOW.x + ext.x - 600,
      y: WINDOW.y + ext.y - 110,
      width: 860,
      move: 900,
    },
  ]);
  const e = envelope(t, S, EXIT, { rise: 40, duration: 900 });
  const saved = t >= PRESS;
  const pop = ease.outQuint(progress(t, PRESS, 420));
  const pointer = glide(t, [
    { at: S, x: 980, y: 820 },
    { at: PRESS - 60, ...target, move: 800 },
    { at: PRESS + 700, x: target.x + 90, y: target.y + 80, move: 600 },
  ]);
  return (
    <div
      className={styles.stage}
      style={{
        transform: lens(view),
        visibility: live(t, "save") ? undefined : "hidden",
      }}
    >
      <Mac.Window ref={win} className={styles.browser} style={styled(e)}>
        <header className={styles.toolbar}>
          <span className={styles.history}>
            <IconChevronLeft size={20} />
            <IconChevronRight size={20} />
          </span>
          <span className={styles.address}>
            x.com/noaweiss/status/1822371048821
          </span>
          <span ref={button} className={styles.extension}>
            <Extension t={t} />
          </span>
        </header>
        <div className={styles.page}>
          <nav className={styles.nav}>
            <IconXTwitterGlyph width={34} height={34} className={styles.x} />
            {NAV.map(({ label, Icon }) => (
              <span key={label} className={styles.link}>
                <Icon size={26} />
                {label}
              </span>
            ))}
          </nav>
          <main className={styles.main}>
            <div className={styles.heading}>
              <IconArrowLeft size={22} />
              Post
            </div>
            <div className={styles.author}>
              <img alt="" src={cover(AVATAR.id)} className={styles.avatar} />
              <span className={styles.name}>Noa Weiss</span>
              <span className={styles.handle}>@noaweiss</span>
            </div>
            <p className={styles.text}>gm</p>
            <img
              ref={media}
              alt=""
              src={cover(POST.id)}
              className={styles.media}
            />
            <p className={styles.meta}>
              8:52 AM · Aug 10, 2026 · <b>12.4K</b> Views
            </p>
            <footer className={styles.actions}>
              <span className={styles.action}>
                <IconChatBubble size={22} /> 24
              </span>
              <span className={styles.action}>
                <IconRefresh size={22} /> 31
              </span>
              <span className={styles.action}>
                <IconHeart size={22} /> 412
              </span>
              <span className={styles.action} data-saved={saved || undefined}>
                <span ref={mark} className={styles.glyph}>
                  {BURST.map((i) => (
                    <i
                      key={i}
                      className={styles.spark}
                      style={{
                        opacity: saved ? (1 - pop) * clamp(pop * 6) : 0,
                        transform: `rotate(${i * 45}deg) translateY(${-mix(8, 30, pop)}px) scale(${1 - pop * 0.6})`,
                      }}
                    />
                  ))}
                  <span
                    style={{
                      display: "grid",
                      transform: `scale(${saved ? mix(0.5, 1, pop) + Math.sin(pop * Math.PI) * 0.25 : 1})`,
                    }}
                  >
                    {saved ? (
                      <IconBookmarkFill size={22} />
                    ) : (
                      <IconBookmark size={22} />
                    )}
                  </span>
                </span>
                <span className={styles.roll}>
                  <span
                    style={{
                      transform: `translateY(${-50 * ease.inOut(progress(t, PRESS, 300))}%)`,
                    }}
                  >
                    <span>58</span>
                    <span>59</span>
                  </span>
                </span>
              </span>
              <span className={styles.action}>
                <IconUpload size={22} />
              </span>
            </footer>
          </main>
          <aside className={styles.rail}>
            <span className={styles.search}>
              <IconMagnifier size={18} />
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
        <Flight t={t} from={boxes.media} to={ext} />
        <Toast t={t} anchor={boxes.button} />
        <Cursor
          x={pointer.x}
          y={pointer.y}
          scale={t >= PRESS && t < PRESS + 140 ? 0.86 : 1}
          opacity={
            clamp((t - S - 400) / 250) * (1 - progress(t, PRESS + 350, 300))
          }
        />
      </Mac.Window>
    </div>
  );
}

interface FlightProps {
  t: number;
  from: { x: number; y: number; width: number; height: number };
  to: { x: number; y: number };
}

/** A copy of the photo lifting off the post and arcing into Pond's button. */
function Flight({ t, from, to }: FlightProps) {
  if (t < LIFT || t > LAND + 80) return null;
  const lift = ease.out(progress(t, LIFT, 220));
  const k = ease.inOut(progress(t, FLY, LAND - FLY));
  const size = ease.in(progress(t, FLY, LAND - FLY));
  const width = mix(from.width, 34, size);
  const height = mix(from.height, 34, size);
  const x = mix(from.x + from.width / 2, to.x, k);
  const y =
    mix(from.y + from.height / 2, to.y, k) - Math.sin(k * Math.PI) * 140;
  return (
    <img
      alt=""
      src={cover(POST.id)}
      className={styles.flight}
      style={{
        left: x - width / 2,
        top: y - height / 2,
        width,
        height,
        borderRadius: mix(18, 9, size),
        opacity: 1 - progress(t, LAND - 40, 100),
        transform: `scale(${1 + lift * 0.04 * (1 - k)}) rotate(${Math.sin(k * Math.PI) * -6}deg)`,
        boxShadow: `0 ${mix(4, 24, lift)}px ${mix(12, 48, lift)}px -12px rgb(0 0 0 / ${0.35 * lift})`,
      }}
    />
  );
}

/** Pond's toolbar button: catches the photo, spins its loader, then settles back into the mark with a check. */
function Extension({ t }: { t: number }) {
  const catchIt = Math.sin(progress(t, LAND, 280) * Math.PI) * 0.22;
  const toRing = ease.inOut(progress(t, LAND, 220));
  const open = ease.inOut(progress(t, LAND + 220, 200));
  const shut = ease.inOut(progress(t, LAND + 700, 180));
  const back = ease.inOut(progress(t, LAND + 880, 260));
  const check = ease.outQuint(progress(t, LAND + 1080, 420));
  const ring = back > 0 ? back : 1 - toRing;
  const spinning = t >= LAND + 220 && back <= 0;
  const settle = Math.sin(progress(t, LAND + 1140, 300) * Math.PI) * 0.12;
  const done = t >= LAND + 1080;
  return (
    <>
      <span
        className={styles.icon}
        data-done={done || undefined}
        style={{ transform: `scale(${1 + catchIt + settle})` }}
      >
        <Morph
          size={26}
          mark={ring}
          close={spinning ? 1 - open + shut : 1}
          turn={spinning ? ((t - LAND - 220) / 700) * 360 : 0}
        />
      </span>
      <span
        className={styles.badge}
        style={{
          opacity: clamp(check * 2),
          transform: `scale(${mix(0.3, 1, check)})`,
        }}
      >
        <IconCheck size={12} strokeWidth={2.5} />
      </span>
    </>
  );
}

/** The confirmation that drops from Pond's button once the copy is in. */
function Toast({
  t,
  anchor,
}: {
  t: number;
  anchor: { x: number; y: number; width: number; height: number };
}) {
  const at = LAND + 1150;
  if (t < at) return null;
  const p = ease.outQuint(progress(t, at, 650));
  return (
    <div
      className={styles.toast}
      style={{
        top: anchor.y + anchor.height + 14,
        right: BROWSER_WIDTH - anchor.x - anchor.width - 6,
        opacity: clamp(p * 1.6),
        filter: p < 0.98 ? `blur(${(1 - p) * 6}px)` : undefined,
        transform: `translateY(${(1 - p) * -14}px) scale(${mix(0.9, 1, p)})`,
      }}
    >
      <img alt="" src={cover(POST.id)} className={styles.thumb} />
      <span className={styles.copy}>
        <span className={styles.saved}>Saved to Pond</span>
        <span className={styles.where}>Posts · Just now</span>
      </span>
    </div>
  );
}
