import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import styles from "./styles.module.css";

function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

interface RootProps extends HTMLAttributes<HTMLElement> {
  id?: string;
  children: ReactNode;
  bleed?: boolean;
}

function Root({ id, className, children, bleed, ...rest }: RootProps) {
  return (
    <section
      id={id}
      className={cx(
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

function Header({ children }: { children: ReactNode }) {
  return <header className={styles.header}>{children}</header>;
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

interface GridProps {
  children: ReactNode;
  columns?: 12;
  className?: string;
}

function Grid({ children, className }: GridProps) {
  return <div className={cx(styles.grid, className)}>{children}</div>;
}

type CardSpan = 4 | 5 | 6 | 7 | 8 | 12;
type CardTone = "default" | "muted" | "feature";

interface CardProps {
  children?: ReactNode;
  span?: CardSpan;
  spanMd?: CardSpan;
  tone?: CardTone;
  padded?: boolean;
  className?: string;
  title?: ReactNode;
  description?: ReactNode;
  fragment?: ReactNode;
}

function Card({
  children,
  span = 6,
  spanMd,
  tone = "default",
  padded = true,
  className,
  title,
  description,
  fragment,
}: CardProps) {
  const style: CSSProperties = {
    ["--card-span" as string]: String(span),
    ["--card-span-md" as string]: String(spanMd ?? Math.min(span, 6)),
  };

  if (title || description || fragment) {
    return (
      <article
        className={cx(
          styles.card,
          styles[`card-${tone}`],
          padded && styles["card-padded"],
          className,
        )}
        style={style}
      >
        {fragment ? (
          <div className={styles["card-fragment"]}>{fragment}</div>
        ) : null}
        {(title || description) && (
          <div className={styles["card-body"]}>
            {title ? <h3 className={styles["card-title"]}>{title}</h3> : null}
            {description ? (
              <p className={styles["card-description"]}>{description}</p>
            ) : null}
          </div>
        )}
        {children}
      </article>
    );
  }

  return (
    <article
      className={cx(
        styles.card,
        styles[`card-${tone}`],
        padded && styles["card-padded"],
        className,
      )}
      style={style}
    >
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
