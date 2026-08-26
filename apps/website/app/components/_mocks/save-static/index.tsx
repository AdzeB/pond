import { IconCheck3Outline12 } from "@pond/icons/outline/12";
import { Logo } from "@pond/ui/logo";
import Image from "next/image";
import { demoImage, SAVES } from "../saves";
import styles from "./styles.module.css";

const PAGE_PINS = [1, 9, 15];
const STRIP_THUMBS = [21, 14, 4];

const aspectOf = (seed: number) =>
  SAVES.find((save) => save.seed === seed)?.aspect ?? 1;

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
          <Logo size={13} />
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
            <IconCheck3Outline12 />
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
