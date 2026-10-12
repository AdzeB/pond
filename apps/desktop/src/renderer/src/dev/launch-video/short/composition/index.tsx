import { HEIGHT, WIDTH } from "../../stage/timeline";
import { App } from "../app";
import { Outro } from "../outro";
import { Save } from "../save";
import { Sources } from "../sources";
import { end, type SceneId, start } from "../timeline";
import { Title } from "../title";
import { Wordmark } from "../wordmark";
import styles from "./styles.module.css";

const TITLES: { scene: SceneId; label: string; text: string }[] = [
  { scene: "saveTitle", label: "Save", text: "Like or bookmark as usual" },
  {
    scene: "findTitle",
    label: "Find",
    text: "Plain-language search, precise filters",
  },
  { scene: "askTitle", label: "Ask", text: "With your key or a local model" },
];

/** One frame of the short cut at time `t`. */
export function Composition({ t }: { t: number }) {
  return (
    <div className={styles.frame} style={{ width: WIDTH, height: HEIGHT }}>
      <Wordmark
        t={t}
        spin
        enter={start("logo") + 700}
        retract={end("logo") - 550}
        exit={end("logo") - 300}
      />
      <Sources t={t} />
      {TITLES.map(({ scene, label, text }) => (
        <Title
          key={scene}
          t={t}
          enter={start(scene)}
          exit={end(scene) - 320}
          label={label}
          text={text}
        />
      ))}
      <Save t={t} />
      <App t={t} />
      <Outro t={t} />
    </div>
  );
}
