import { Logo } from "@pond/ui/logo";
import { ease, envelope, mix, progress, styled } from "../../stage/timeline";
import { Caption } from "../caption";
import { end, start } from "../timeline";
import styles from "./styles.module.css";

/** The thesis, the offer, and the mark, as the first cut ends. */
export function Outro({ t }: { t: number }) {
  return (
    <>
      <Caption
        t={t}
        text="The invisible layer between collecting and organizing."
        enter={start("thesis")}
        exit={end("thesis") - 450}
        stagger={70}
      />
      <Caption
        t={t}
        text="Give it a try. It's free and open source."
        enter={start("offer")}
        exit={end("offer") - 450}
        stagger={70}
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
