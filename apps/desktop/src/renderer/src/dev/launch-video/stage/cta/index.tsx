import { IconMagnifier } from "@pond/icons";
import { IconApple } from "@pond/icons/social-media";
import { Button } from "@pond/ui/button";
import { Logo } from "@pond/ui/logo";
import { Cursor, glide, pressing } from "../cursor";
import {
  BEATS,
  clamp,
  ease,
  envelope,
  mix,
  progress,
  styled,
} from "../timeline";
import type { Variant } from "../variant";
import { QR_PATH, QR_SIZE } from "./qr";
import styles from "./styles.module.css";

const [START, END] = BEATS.end;
const EXIT = END - 350;
const URL = "pond.app";

function Address({ t }: { t: number }) {
  const logo = envelope(t, START, EXIT, { duration: 900, rise: 18, out: 400 });
  const pill = envelope(t, START + 280, EXIT, {
    duration: 800,
    rise: 22,
    out: 400,
  });
  const typed = clamp(Math.floor((t - START - 650) / 75), 0, URL.length);
  const blink =
    t < START + 650 + URL.length * 75 + 100 || Math.floor(t / 420) % 2 === 0;
  return (
    <>
      <div
        className={styles.mark}
        style={styled(logo, "translate(-50%, -50%)")}
      >
        <Logo size={104} aria-hidden />
      </div>
      <div
        className={styles.address}
        style={styled(pill, "translate(-50%, -50%)")}
      >
        <IconMagnifier size={38} className={styles.glass} />
        <span className={styles.url}>
          {URL.slice(0, typed)}
          {blink ? <span className={styles.caret} /> : null}
        </span>
      </div>
    </>
  );
}

const PRESS = START + 1250;

function Download({ t }: { t: number }) {
  const brand = envelope(t, START, EXIT, { duration: 900, rise: 18, out: 400 });
  const action = envelope(t, START + 300, EXIT, {
    duration: 800,
    rise: 22,
    out: 400,
  });
  const point = glide(t, [
    { at: START + 300, x: 1240, y: 860 },
    { at: PRESS - 60, x: 1010, y: 668, move: 800 },
    { at: PRESS + 700, x: 1060, y: 720, move: 600 },
  ]);
  const down = pressing(t, [PRESS]);
  const pop = ease.outQuint(progress(t, PRESS, 400));
  return (
    <>
      <div
        className={styles.brand}
        style={styled(brand, "translate(-50%, -50%)")}
      >
        <Logo size={92} aria-hidden />
        Pond
      </div>
      <div
        className={styles.action}
        style={styled(
          action,
          `translate(-50%, -50%) scale(${2 * (down ? 0.97 : mix(0.985, 1, pop))})`,
        )}
      >
        <Button size="lg" variant="primary" rounding="pill" tabIndex={-1}>
          <IconApple width={16} height={16} />
          Download for Mac
        </Button>
      </div>
      <div className={styles.pointer}>
        <Cursor
          x={point.x}
          y={point.y}
          scale={down ? 0.86 : 1}
          opacity={clamp((t - START - 450) / 200) * action.opacity}
        />
      </div>
    </>
  );
}

const SWAP = START + 650;

function Code({ t }: { t: number }) {
  const first = envelope(t, START, SWAP, { duration: 600, rise: 0, out: 250 });
  const scale = mix(0.9, 1, ease.outQuint(progress(t, START, 900)));
  const second = envelope(t, SWAP + 100, EXIT, {
    duration: 650,
    rise: 20,
    out: 350,
  });
  const label = envelope(t, SWAP + 220, EXIT, {
    duration: 650,
    rise: 20,
    out: 350,
  });
  return (
    <>
      <div
        className={styles.mark}
        style={{
          ...styled(first, `translate(-50%, -50%) scale(${scale})`),
          top: 540,
        }}
      >
        <Logo size={128} aria-hidden />
      </div>
      <div className={styles.code}>
        <span className={styles.tile} style={styled(second)}>
          <svg
            viewBox={`0 0 ${QR_SIZE} ${QR_SIZE}`}
            className={styles.qr}
            aria-hidden
          >
            <path d={QR_PATH} fill="currentColor" shapeRendering="crispEdges" />
          </svg>
        </span>
        <span className={styles.label} style={styled(label)}>
          <span className={styles.name}>
            <Logo size={56} aria-hidden />
            Pond
          </span>
          <span className={styles.domain}>{URL}</span>
        </span>
      </div>
    </>
  );
}

/** The closing card when a call-to-action variant is on review. */
export function Cta({ t, variant }: { t: number; variant: Variant }) {
  if (t < START - 50) return null;
  if (variant === "cta-url") return <Address t={t} />;
  if (variant === "cta-button") return <Download t={t} />;
  return <Code t={t} />;
}
