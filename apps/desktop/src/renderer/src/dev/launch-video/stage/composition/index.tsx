import { Browser } from "../browser";
import { Enrich } from "../enrich";
import { Finder } from "../finder";
import { Headlines } from "../headlines";
import { Sea } from "../sea";
import { Statements } from "../statement";
import { Sync } from "../sync";
import { Terminal } from "../terminal";
import { HEIGHT, WIDTH } from "../timeline";
import { Windows } from "../windows";
import styles from "./styles.module.css";

/** One video frame at time `t`. */
export function Composition({ t }: { t: number }) {
  return (
    <div className={styles.frame} style={{ width: WIDTH, height: HEIGHT }}>
      <Sea t={t} />
      <Browser t={t} />
      <Sync t={t} />
      <Finder t={t} />
      <Enrich t={t} />
      <Windows t={t} />
      <Terminal t={t} />
      <Headlines t={t} />
      <Statements t={t} />
    </div>
  );
}
