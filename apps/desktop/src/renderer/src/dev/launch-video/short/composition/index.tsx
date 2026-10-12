import { Enrich } from "../../stage/enrich";
import { Finder } from "../../stage/finder";
import { Sea } from "../../stage/sea";
import { Terminal } from "../../stage/terminal";
import { HEIGHT, WIDTH } from "../../stage/timeline";
import { Ask } from "../ask";
import { Caption } from "../caption";
import { Find } from "../find";
import { Outro } from "../outro";
import { Save } from "../save";
import { Shift } from "../shift";
import { Sources } from "../sources";
import { end, type SceneId, start } from "../timeline";
import { Wordmark } from "../wordmark";
import styles from "./styles.module.css";

const TITLES: { scene: SceneId; text: string }[] = [
  {
    scene: "saveTitle",
    text: "Like or bookmark as usual. Pond keeps a copy.",
  },
  {
    scene: "ownTitle",
    text: "Local-first. Every save is a file you own.",
  },
  {
    scene: "enrichTitle",
    text: "Every save is analyzed on-device.",
  },
  {
    scene: "findTitle",
    text: "Search everything you've ever saved.",
  },
  {
    scene: "askTitle",
    text: "Bring your favorite AI to your saves.",
  },
  {
    scene: "connectTitle",
    text: "Plug your library into any MCP client.",
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
      <Shift t={t} scene="own" y={-100}>
        <Finder t={t} open={start("own")} close={end("own") - 350} />
      </Shift>
      <Shift t={t} scene="enrich" y={-95}>
        <Enrich t={t} open={start("enrich")} close={end("enrich") - 350} />
      </Shift>
      <Find t={t} />
      <Ask t={t} />
      <Shift t={t} scene="connect" y={-60}>
        <Terminal t={t} open={start("connect")} close={end("connect") - 350} />
      </Shift>
      <Outro t={t} />
    </div>
  );
}
