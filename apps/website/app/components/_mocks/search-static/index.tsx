import { IconMagnifier } from "@pond/icons";
import Image from "next/image";
import { demoImage, SAVES } from "../saves";
import styles from "./styles.module.css";

const RESULTS = [1, 9, 15, 21];

const aspectOf = (seed: number) =>
  SAVES.find((save) => save.seed === seed)?.aspect ?? 1;

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
          <div className={styles.editor}>
            <span className={styles.icon}>
              <IconMagnifier size={12} />
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
