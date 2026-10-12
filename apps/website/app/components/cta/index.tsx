import type { ReactNode } from "react";
import styles from "./styles.module.css";

interface CtaProps {
  href: string;
  children: ReactNode;
  variant?: "solid" | "soft";
}

export function Cta({ href, children, variant = "solid" }: CtaProps) {
  return (
    <a className={styles.root} data-variant={variant} href={href}>
      {children}
    </a>
  );
}
