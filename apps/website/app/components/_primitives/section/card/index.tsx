import { clsx as cn } from "clsx";
import type { CSSProperties, ReactNode } from "react";
import styles from "./styles.module.css";

type CardSpan = 4 | 5 | 6 | 7 | 8 | 12;

interface CardProps {
  children?: ReactNode;
  span?: CardSpan;
  spanMd?: CardSpan;
  className?: string;
  index?: string;
  title?: ReactNode;
  description?: ReactNode;
  fragment?: ReactNode;
  media?: "start" | "end";
  surface?: "panel" | "plain";
}

interface CardStyle extends CSSProperties {
  "--card-span"?: string;
  "--card-span-md"?: string;
}

export function Card({
  children,
  span = 6,
  spanMd,
  className,
  index,
  title,
  description,
  fragment,
  media = "start",
  surface = "panel",
}: CardProps) {
  const style: CardStyle = {
    "--card-span": String(span),
    "--card-span-md": String(spanMd ?? (span >= 8 ? 12 : span)),
  };

  const body =
    index || title || description ? (
      <div className={styles.body}>
        {index ? <p className={styles.index}>{index}</p> : null}
        {title ? <h3 className={styles.title}>{title}</h3> : null}
        {description ? (
          <p className={styles.description}>{description}</p>
        ) : null}
      </div>
    ) : null;

  return (
    <article
      className={cn(styles.card, className)}
      data-media={media}
      data-surface={surface}
      style={style}
    >
      {media === "end" ? body : null}
      {fragment ? <div className={styles.fragment}>{fragment}</div> : null}
      {media !== "end" ? body : null}
      {children}
    </article>
  );
}
