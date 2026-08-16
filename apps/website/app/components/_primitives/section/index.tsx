import { clsx as cn } from "clsx";
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import styles from "./styles.module.css";

interface RootProps extends HTMLAttributes<HTMLElement> {
  id?: string;
  children: ReactNode;
  bleed?: boolean;
}

function Root({ id, className, children, bleed, ...rest }: RootProps) {
  return (
    <section
      id={id}
      className={cn(
        styles.section,
        bleed && styles["section-bleed"],
        className,
      )}
      {...rest}
    >
      <div className={styles.inner}>{children}</div>
    </section>
  );
}

function Header({
  children,
  align = "center",
}: {
  children: ReactNode;
  align?: "center" | "start";
}) {
  return (
    <header className={styles.header} data-align={align}>
      {children}
    </header>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className={styles.eyebrow}>{children}</p>;
}

function Title({
  children,
  as = "h2",
}: {
  children: ReactNode;
  as?: "h1" | "h2";
}) {
  const Component = as;
  return <Component className={styles.title}>{children}</Component>;
}

function Lead({ children }: { children: ReactNode }) {
  return <p className={styles.lead}>{children}</p>;
}

function Grid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn(styles.grid, className)}>{children}</div>;
}

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

function Card({
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
  const style: CSSProperties = {
    ["--card-span" as string]: String(span),
    ["--card-span-md" as string]: String(spanMd ?? (span >= 8 ? 12 : span)),
  };

  const body =
    index || title || description ? (
      <div className={styles["card-body"]}>
        {index ? <p className={styles["card-index"]}>{index}</p> : null}
        {title ? <h3 className={styles["card-title"]}>{title}</h3> : null}
        {description ? (
          <p className={styles["card-description"]}>{description}</p>
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
      {fragment ? (
        <div className={styles["card-fragment"]}>{fragment}</div>
      ) : null}
      {media !== "end" ? body : null}
      {children}
    </article>
  );
}

export const Section = {
  Root,
  Header,
  Eyebrow,
  Title,
  Lead,
  Grid,
  Card,
};
