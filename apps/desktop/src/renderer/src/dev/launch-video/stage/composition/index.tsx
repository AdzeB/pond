import { Captions } from "../caption";
import { Cloud } from "../cloud";
import { Finder } from "../finder";
import { Post } from "../post";
import { Statements } from "../statement";
import { Terminal } from "../terminal";
import { HEIGHT, WIDTH } from "../timeline";
import { Windows } from "../windows";
import styles from "./styles.module.css";

/** One video frame at time `t`. */
export function Composition({ t }: { t: number }) {
  return (
    <div className={styles.frame} style={{ width: WIDTH, height: HEIGHT }}>
      <Cloud t={t} />
      <Post t={t} />
      <Windows t={t} />
      <Finder t={t} />
      <Terminal t={t} />
      <Captions t={t} />
      <Statements t={t} />
    </div>
  );
}
