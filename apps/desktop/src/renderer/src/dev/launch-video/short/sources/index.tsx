import { LOGO_PATH, LOGO_VIEW_BOX } from "@pond/ui/logo";
import { brand } from "../../stage/brands";
import {
  clamp,
  ease,
  envelope,
  mix,
  progress,
  styled,
} from "../../stage/timeline";
import { Glow } from "../glow";
import { end, start } from "../timeline";
import styles from "./styles.module.css";

const CHIPS = [
  { label: "X", brands: ["x"] },
  { label: "Instagram", brands: ["instagram"] },
  { label: "Pinterest", brands: ["pinterest"] },
  { label: "and more", brands: ["reddit", "tiktok", "youtube", "threads"] },
];

const GAP = 236;
const POP = start("sources") + 600;
const BEAT = 500;
const MERGE = start("sources") + 3000;
const EXIT = end("sources") - 350;
const FOLDER = { x: 960, y: 700 };

/** The sources Pond keeps saves from, dropping into one folder on your Mac. */
export function Sources({ t }: { t: number }) {
  if (t < start("sources") || t > end("sources") + 50) return null;
  const first = envelope(t, start("sources") + 50, MERGE, { rise: 20 });
  const second = envelope(t, MERGE + 100, EXIT, { rise: 20 });
  const labels = 1 - ease.in(progress(t, MERGE - 100, 300));
  const mac = ease.out(progress(t, MERGE + 650, 450));
  const folder = ease.outQuint(progress(t, MERGE + 50, 700));
  const land = progress(t, MERGE + 650, 360);
  const bump = Math.sin(land * Math.PI) * 0.05;
  const gone = ease.in(progress(t, EXIT, 350));
  const shell = {
    left: FOLDER.x,
    top: FOLDER.y,
    opacity: clamp(folder * 2) * (1 - gone),
    transform: `translate(-50%, -50%) translateY(${(1 - folder) * 40 + gone * 20}px) scale(${mix(0.85, 1, folder) + bump}, ${mix(0.85, 1, folder) - bump})`,
    filter: gone > 0.01 ? `blur(${gone * 8}px)` : undefined,
  };
  return (
    <>
      <p className={styles.line} style={styled(first)}>
        Keep what you save on
      </p>
      <p className={styles.line} style={styled(second)}>
        in a folder on <Glow amount={mac}>your Mac.</Glow>
      </p>
      <svg
        aria-hidden
        className={styles.folder}
        data-part="back"
        viewBox="0 0 240 192"
        style={shell}
      >
        <path
          d="M0 26Q0 8 18 8H82Q93 8 100 17L108 28H222Q240 28 240 46V174Q240 192 222 192H18Q0 192 0 174Z"
          fill="#4aa9ee"
        />
      </svg>
      <svg
        aria-hidden
        className={styles.folder}
        data-part="front"
        viewBox="0 0 240 192"
        style={shell}
      >
        <defs>
          <linearGradient id="folder-front" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8ed2ff" />
            <stop offset="1" stopColor="#3aa3f3" />
          </linearGradient>
        </defs>
        <rect
          y="50"
          width="240"
          height="142"
          rx="18"
          fill="url(#folder-front)"
        />
        <path
          d={LOGO_PATH}
          fill="rgb(0 80 160 / 0.28)"
          transform={`translate(88 89) scale(${64 / LOGO_VIEW_BOX})`}
        />
      </svg>
      {CHIPS.map((chip, i) => {
        const pop = ease.outQuint(progress(t, POP + i * BEAT, 550));
        const fly = ease.inOut(progress(t, MERGE + i * 60, 650));
        const home = { x: 960 + (i - 1.5) * GAP, y: 600 };
        const x = mix(home.x, FOLDER.x, fly);
        const y =
          mix(home.y, FOLDER.y + 20, fly) - Math.sin(fly * Math.PI) * 150;
        const scale = mix(0.6, 1, pop) * mix(1, 0.42, fly);
        const opacity =
          clamp(pop * 2) * (1 - progress(t, MERGE + 640 + i * 60, 80));
        return (
          <div key={chip.label}>
            <div
              className={styles.chip}
              data-many={chip.brands.length > 1 || undefined}
              style={{
                left: x,
                top: y,
                opacity,
                transform: `translate(-50%, -50%) scale(${scale})`,
                filter: pop < 0.98 ? `blur(${(1 - pop) * 8}px)` : undefined,
                visibility: opacity <= 0.002 ? "hidden" : undefined,
              }}
            >
              {chip.brands.map((id) => {
                const { Icon } = brand(id);
                return <Icon key={id} className={styles.icon} />;
              })}
            </div>
            <span
              className={styles.label}
              style={{
                left: home.x,
                opacity: clamp(pop * 1.5) * labels,
                transform: `translate(-50%, ${(1 - pop) * 14}px)`,
              }}
            >
              {chip.label}
            </span>
            {i > 0 ? (
              <span
                className={styles.slash}
                style={{
                  left: home.x - GAP / 2,
                  opacity: clamp(pop * 1.5) * labels,
                }}
              >
                /
              </span>
            ) : null}
          </div>
        );
      })}
    </>
  );
}
