import { Logo } from "@pond/ui/logo";
import { Line } from "../../stage/line";
import { ease, envelope, mix, progress, styled } from "../../stage/timeline";
import { end, start } from "../timeline";
import styles from "./styles.module.css";

/** The thesis, the offer, and the mark, as the first cut ends. */
export function Outro({ t }: { t: number }) {
  return (
    <>
      <Line
        t={t}
        y={499}
        text="The invisible layer between"
        enter={start("thesis")}
        exit={end("thesis") - 400}
        stagger={60}
      />
      <Line
        t={t}
        y={581}
        text="collecting and organizing."
        enter={start("thesis") + 350}
        exit={end("thesis") - 400}
        stagger={60}
      />
      <Line
        t={t}
        text="Give it a try. It's free and open source."
        enter={start("offer")}
        exit={end("offer") - 400}
        stagger={60}
      />
      <End t={t} />
    </>
  );
}

function End({ t }: { t: number }) {
  if (t < start("end")) return null;
  const e = envelope(t, start("end"), Number.POSITIVE_INFINITY, {
    duration: 1200,
    rise: 0,
  });
  const scale = mix(0.9, 1, ease.outQuint(progress(t, start("end"), 1400)));
  return (
    <div
      className={styles.end}
      style={styled(e, `translate(-50%, -50%) scale(${scale})`)}
    >
      <Logo size={128} aria-hidden />
    </div>
  );
}
