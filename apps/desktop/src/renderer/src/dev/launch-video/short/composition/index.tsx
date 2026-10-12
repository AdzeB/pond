import { Sea } from "../../stage/sea";
import { HEIGHT, WIDTH } from "../../stage/timeline";
import { Ask } from "../ask";
import { Caption } from "../caption";
import { Find } from "../find";
import { Outro } from "../outro";
import { Save } from "../save";
import { Sources } from "../sources";
import { end, type SceneId, start } from "../timeline";
import { Wordmark } from "../wordmark";
import styles from "./styles.module.css";

const TITLES: { scene: SceneId; text: string }[] = [
  {
    scene: "saveTitle",
    text: "Like or bookmark as usual.\nPond keeps a copy on your Mac.",
  },
  {
    scene: "findTitle",
    text: "Search in plain language,\nthen narrow it down by color.",
  },
  {
    scene: "askTitle",
    text: "Ask about your saves\nwith your key or a local model.",
  },
];

/** One frame of the short cut at time `t`. */
export function Composition({ t }: { t: number }) {
  return (
    <div className={styles.frame} style={{ width: WIDTH, height: HEIGHT }}>
      <Sea t={t - start("sea")} />
      <Caption
        t={t}
        text="The web is a sea of information."
        enter={start("sea") + 150}
        exit={start("sea") + 2150}
      />
      <Wordmark
        t={t}
        enter={start("logo") + 700}
        retract={end("logo") - 300}
        exit={end("logo") - 300}
      />
      <Sources t={t} />
      {TITLES.map(({ scene, text }) => (
        <Caption
          key={scene}
          t={t}
          text={text}
          enter={start(scene)}
          exit={end(scene) - 380}
        />
      ))}
      <Save t={t} />
      <Find t={t} />
      <Ask t={t} />
      <Outro t={t} />
    </div>
  );
}
