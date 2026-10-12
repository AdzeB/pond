import { HEIGHT, WIDTH } from "../../stage/timeline";
import { App } from "../app";
import { Backdrop } from "../backdrop";
import { ASK, FIND } from "../camera";
import { Caption } from "../caption";
import { Hook } from "../hook";
import { Outro } from "../outro";
import { SAVE, Save } from "../save";
import { Sources } from "../sources";
import { start } from "../timeline";
import { Values } from "../values";
import styles from "./styles.module.css";

/** One frame of the short cut at time `t`. */
export function Composition({ t }: { t: number }) {
  return (
    <div className={styles.frame} style={{ width: WIDTH, height: HEIGHT }}>
      <Backdrop t={t} />
      <Hook t={t} />
      <Sources t={t} />
      <Save t={t} />
      <App t={t} />
      <Caption
        t={t}
        label="Save"
        exit={SAVE.exit}
        lines={[
          { text: "Like or bookmark as usual.", at: start("save") + 200 },
          { text: "Pond keeps a copy.", at: SAVE.press + 700 },
        ]}
      />
      <Caption
        t={t}
        label="Find"
        exit={FIND.exit}
        lines={[
          {
            text: "Plain-language search, precise filters.",
            at: start("find") + 200,
          },
        ]}
      />
      <Caption
        t={t}
        label="Ask"
        exit={ASK.exit}
        lines={[
          { text: "With your key or a local model.", at: ASK.enter + 200 },
        ]}
      />
      <Values t={t} />
      <Outro t={t} />
    </div>
  );
}
