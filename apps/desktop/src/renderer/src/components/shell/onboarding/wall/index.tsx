import { motion } from "motion/react";
import { getSourceLogo } from "@/lib/save/sources-registry";
import { WALL_COLUMNS, WALL_MEDIA, type WallItem } from "../wall-data";
import styles from "./styles.module.css";

function SourceBadge({ source }: { source: string }) {
  const logo = getSourceLogo(source);
  if (!logo) return null;
  return (
    <span className={styles["ghost-badge"]}>
      <img src={logo} alt="" width={18} height={18} draggable={false} />
    </span>
  );
}

const reducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

function WallCard({ item, delay }: { item: WallItem; delay: number }) {
  return (
    <motion.div
      className={styles.ghost}
      initial={reducedMotion ? false : { opacity: 0, y: 20, scale: 0.96 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { type: "spring", duration: 0.9, bounce: 0, delay },
      }}
    >
      <div className={styles["ghost-frame"]}>
        {item.video ? (
          <video
            className={styles["ghost-art"]}
            src={WALL_MEDIA[item.img]}
            poster={WALL_MEDIA[`${item.img}-poster`]}
            autoPlay={!reducedMotion}
            muted
            loop
            playsInline
            disablePictureInPicture
          />
        ) : (
          <img
            className={styles["ghost-art"]}
            src={WALL_MEDIA[item.img]}
            alt=""
            draggable={false}
          />
        )}
        {item.source ? <SourceBadge source={item.source} /> : null}
      </div>
      <div className={styles["ghost-meta"]}>
        <span className={styles["ghost-title"]}>{item.title}</span>
        <span className={styles["ghost-stat"]}>{item.stat}</span>
      </div>
    </motion.div>
  );
}

export function Wall() {
  return (
    <div className={styles.panel} aria-hidden>
      <div className={styles.wall}>
        {WALL_COLUMNS.map((cards, col) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: static decorative list
            key={col}
            className={styles["wall-column"]}
            data-direction={col % 2 === 0 ? "up" : "down"}
          >
            {[0, 1].map((half) => (
              <div key={half} className={styles["wall-half"]}>
                {cards.map((item, i) => (
                  <WallCard
                    // biome-ignore lint/suspicious/noArrayIndexKey: static decorative list
                    key={i}
                    item={item}
                    delay={0.1 + col * 0.07 + i * 0.05}
                  />
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
