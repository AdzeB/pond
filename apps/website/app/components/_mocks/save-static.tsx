import { IconCheckOutline18 } from "@pond/icons/outline/18";
import Image from "next/image";
import { Mark } from "../_fragments/mark";
import styles from "./save-static.module.css";
import { demoImage, SAVES } from "./saves";

const PAGE_PINS = [1, 9, 15];
const STRIP_THUMBS = [21, 14, 4];

const aspectOf = (seed: number) =>
  SAVES.find((save) => save.seed === seed)?.aspect ?? 1;

/** Browser window frozen mid-save: Pond button pressed, toast up, thumbs landing in the library strip. */
export function SaveStatic() {
  return (
    <div className={styles.window} aria-hidden>
      <div className={styles.chrome}>
        <span className={styles.lights}>
          <span className={styles.light} />
          <span className={styles.light} />
          <span className={styles.light} />
        </span>
        <span className={styles.url}>pinterest.com/search/pins?q=fits</span>
        <span className={styles.extension}>
          <Mark size={13} />
        </span>
      </div>
      <div className={styles.page}>
        <div className={styles["page-grid"]}>
          {PAGE_PINS.map((seed) => (
            <span
              key={seed}
              className={styles.pin}
              style={{ aspectRatio: String(aspectOf(seed)) }}
            >
              <Image src={demoImage(seed)} alt="" width={200} height={280} />
            </span>
          ))}
        </div>
        <div className={styles.toast}>
          <span className={styles["toast-icon"]}>
            <IconCheckOutline18 width={12} height={12} />
          </span>
          <span className={styles["toast-body"]}>
            <span className={styles["toast-title"]}>Saved to Pond</span>
            <span className={styles["toast-meta"]}>image · pinterest</span>
          </span>
        </div>
      </div>
      <div className={styles.strip}>
        <span className={styles["strip-label"]}>My Pond.pond</span>
        <div className={styles["strip-items"]}>
          {STRIP_THUMBS.map((seed) => (
            <span key={seed} className={styles["strip-thumb"]}>
              <Image src={demoImage(seed)} alt="" width={64} height={64} />
            </span>
          ))}
        </div>
        <span className={styles["strip-count"]}>3</span>
      </div>
    </div>
  );
}
