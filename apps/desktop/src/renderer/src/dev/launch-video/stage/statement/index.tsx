import { Logo } from "@pond/ui/logo";
import { Line } from "../line";
import { BEATS, ease, envelope, mix, progress, styled } from "../timeline";
import styles from "./styles.module.css";

function End({ t }: { t: number }) {
  const [start, end] = BEATS.end;
  if (t < start) return null;
  const e = envelope(t, start, end - 650, {
    duration: 1200,
    rise: 0,
    out: 600,
  });
  const scale = mix(0.9, 1, ease.outQuint(progress(t, start, 1400)));
  return (
    <div
      className={styles.end}
      style={styled(e, `translate(-50%, -50%) scale(${scale})`)}
    >
      <Logo size={128} aria-hidden />
    </div>
  );
}

/** Full-frame lines between the product beats. */
export function Statements({ t }: { t: number }) {
  return (
    <>
      <Line
        t={t}
        text="The web is a sea of information."
        enter={BEATS.sea[0]}
        exit={2170}
      />
      <Line
        t={t}
        text="Introducing Pond"
        enter={BEATS.intro[0]}
        exit={BEATS.intro[1] - 350}
      />
      <Line
        t={t}
        y={499}
        text="The invisible layer between"
        enter={BEATS.thesis[0]}
        exit={BEATS.thesis[1] - 400}
        stagger={60}
      />
      <Line
        t={t}
        y={581}
        text="collecting and organizing."
        enter={BEATS.thesis[0] + 350}
        exit={BEATS.thesis[1] - 400}
        stagger={60}
      />
      <Line
        t={t}
        text="Give it a try. It's free and open source."
        enter={BEATS.offer[0]}
        exit={BEATS.offer[1] - 400}
        stagger={60}
      />
      <End t={t} />
    </>
  );
}
