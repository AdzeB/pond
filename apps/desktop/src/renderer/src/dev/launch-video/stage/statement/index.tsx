import { Logo } from "@pond/ui/logo";
import {
  BEATS,
  type BeatId,
  clamp,
  ease,
  presence,
  progress,
} from "../timeline";
import { Words } from "../words";
import styles from "./styles.module.css";

const SOURCES = [
  "Instagram",
  "Pinterest",
  "X",
  "YouTube",
  "Threads",
  "Are.na",
  "TikTok",
  "anywhere.",
];

function Line({
  t,
  beat,
  children,
}: {
  t: number;
  beat: BeatId;
  children: React.ReactNode;
}) {
  const opacity = presence(t, beat, 1, 320);
  if (opacity <= 0) return null;
  const exit = ease.in(progress(t, BEATS[beat][1] - 320, 320));
  return (
    <div
      className={styles.statement}
      style={{
        opacity,
        transform: `scale(${1 - exit * 0.02})`,
        filter: exit > 0 ? `blur(${exit * 6}px)` : undefined,
      }}
    >
      {children}
    </div>
  );
}

function Rotator({ t }: { t: number }) {
  const start = BEATS.from[0] + 700;
  const step = 260;
  const index = clamp(Math.floor((t - start) / step), 0, SOURCES.length - 1);
  const local = t - start - index * step;
  const p = index === 0 && t < start ? 0 : ease.out(clamp(local / 180));
  return (
    <span className={styles.rotator}>
      <span
        className={styles.source}
        style={{
          transform: `translateY(${(1 - p) * 0.5}em)`,
          opacity: t < start - 200 ? 0 : 0.2 + 0.8 * p,
        }}
      >
        {SOURCES[index]}
      </span>
    </span>
  );
}

/** Full-frame lines between the product beats. */
export function Statements({ t }: { t: number }) {
  const intro = t - BEATS.intro[0];
  const mark = ease.settle(progress(intro, 0, 900));
  return (
    <>
      <Line t={t} beat="hook">
        <Words
          t={t}
          start={BEATS.hook[0] + 300}
          stagger={70}
          runs={[{ text: "The web is a sea of information." }]}
        />
      </Line>
      <Line t={t} beat="intro">
        <div className={styles.intro}>
          <Logo
            size={112}
            className={styles.logo}
            aria-hidden
            style={{
              transform: `scale(${0.4 + 0.6 * mark}) rotate(${(1 - mark) * -90}deg)`,
              opacity: clamp(intro / 200),
            }}
          />
          <Words
            t={t}
            start={BEATS.intro[0] + 420}
            stagger={90}
            runs={[{ text: "Introducing " }, { text: "Pond", tone: "accent" }]}
          />
        </div>
      </Line>
      <Line t={t} beat="from">
        <span className={styles.from}>
          <Words
            t={t}
            start={BEATS.from[0] + 100}
            runs={[{ text: "Save from" }]}
          />
          <Rotator t={t} />
        </span>
      </Line>
      <Line t={t} beat="layer">
        <Words
          t={t}
          start={BEATS.layer[0] + 120}
          stagger={70}
          runs={[
            { text: "Everything you save, " },
            { text: "in one library.", tone: "muted" },
          ]}
        />
      </Line>
      <Line t={t} beat="outro">
        <div className={styles.intro}>
          <Logo size={96} className={styles.logo} aria-hidden />
          <Words
            t={t}
            start={BEATS.outro[0] + 200}
            stagger={90}
            runs={[{ text: "Pond " }, { text: "pond.app", tone: "muted" }]}
          />
        </div>
      </Line>
      <Line t={t} beat="try">
        <Words
          t={t}
          start={BEATS.try[0] + 120}
          stagger={70}
          runs={[
            { text: "Give it a try. " },
            { text: "It's free and open source.", tone: "muted" },
          ]}
        />
      </Line>
    </>
  );
}
