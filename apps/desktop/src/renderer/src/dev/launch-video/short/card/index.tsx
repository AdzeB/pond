import { clsx as cn } from "clsx";
import { brand } from "../../stage/brands";
import { cover, type Sample } from "../../stage/media";
import styles from "./styles.module.css";

interface CardProps extends React.ComponentPropsWithoutRef<"figure"> {
  entry: Sample;
  width: number;
}

/** A library card at the app's real size: thumb with type and source badges, then title and time. */
export function Card({ entry, width, className, style, ...props }: CardProps) {
  const { Icon } = brand(entry.source === "twitter" ? "x" : entry.source);
  return (
    <figure
      className={cn(styles.card, className)}
      style={{ width, ...style }}
      {...props}
    >
      <span className={styles.thumb}>
        <img
          alt=""
          src={cover(entry.id)}
          className={styles.image}
          style={{ height: width / entry.aspect }}
        />
        <span className={styles.type}>JPG</span>
        <span className={styles.source}>
          <Icon />
        </span>
      </span>
      <figcaption className={styles.meta}>
        <span className={styles.title}>{entry.title}</span>
        <span className={styles.time}>{entry.time}</span>
      </figcaption>
    </figure>
  );
}
