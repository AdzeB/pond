import { clsx as cn } from "clsx";
import type { HTMLAttributes, ReactNode } from "react";
import { Card } from "./card";
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
      className={cn(styles.section, className)}
      data-bleed={bleed || undefined}
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

export const Section = {
  Root,
  Header,
  Eyebrow,
  Title,
  Lead,
  Grid,
  Card,
};
