import { Link } from "@tanstack/react-router";
import type { PlaygroundEntry } from "./catalog";
import styles from "./styles.module.css";

export function ElementCard({ entry }: { entry: PlaygroundEntry }) {
  return (
    <Link
      to="/playground/$id"
      params={{ id: entry.id }}
      className={styles.card}
    >
      <div className={styles.top}>
        <span className={styles.name}>{entry.name}</span>
      </div>
      <p className={styles.blurb}>{entry.blurb}</p>
    </Link>
  );
}
