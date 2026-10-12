import type { ReactNode } from "react";
import styles from "./styles.module.css";

interface CtaProps {
  href: string;
  children: ReactNode;
  variant?: "solid" | "ghost" | "inverse";
  external?: boolean;
}

export function Cta({ href, children, variant = "solid", external }: CtaProps) {
  return (
    <a
      className={styles.root}
      data-variant={variant}
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
    >
      {children}
    </a>
  );
}
