"use client";

import { Dock } from "./dock";
import styles from "./dock-showcase.module.css";

const LEGEND = ["New", "Layout", "Zoom", "Sort", "Display", "Search", "Ask"];

/** The library dock at native size, outside the hero window where it renders at 40% scale. */
export function DockShowcase() {
  return (
    <div className={styles.stage} data-neutral="pure" aria-hidden>
      <Dock />
      <p className={styles.legend}>
        {LEGEND.map((label, index) => (
          <span key={label} className={styles["legend-item"]}>
            {index > 0 ? <span className={styles.dot}>·</span> : null}
            {label}
          </span>
        ))}
      </p>
    </div>
  );
}
