import { IconMagnifierOutline18 } from "@pond/icons/outline/18";
import Image from "next/image";
import { demoImage, SAVES } from "./saves";
import styles from "./search-static.module.css";

const RESULTS = [1, 9, 15, 21];

const aspectOf = (seed: number) =>
  SAVES.find((save) => save.seed === seed)?.aspect ?? 1;

/** The library dock frozen mid-search: a source token stacked with free text, results narrowed above. */
export function SearchStatic() {
  return (
    <div className={styles.panel} aria-hidden>
      <div className={styles.results}>
        <div className={styles["results-bar"]}>
          <span>4 results</span>
          <span>source: pinterest</span>
        </div>
        <div className={styles.grid}>
          {RESULTS.map((seed) => (
            <span
              key={seed}
              className={styles.thumb}
              style={{ aspectRatio: String(aspectOf(seed)) }}
            >
              <Image src={demoImage(seed)} alt="" width={160} height={220} />
            </span>
          ))}
        </div>
      </div>
      <div className={styles["dock-area"]}>
        <div className={styles.card}>
          <div className={styles.modes}>
            <span className={styles.mode} data-active>
              Search
            </span>
            <span className={styles.mode}>Ask</span>
          </div>
          <div className={styles.editor}>
            <span className={styles["lead-icon"]}>
              <IconMagnifierOutline18 width={16} height={16} />
            </span>
            <span className={styles.token}>source: pinterest</span>
            <span className={styles.query}>
              outfits
              <span className={styles.caret} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
