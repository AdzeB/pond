import type { AnchorHTMLAttributes } from "react";
import styles from "./link-button.module.css";

type LinkButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  external?: boolean;
  variant?: "primary" | "ghost";
  size?: "md";
};

export function LinkButton({
  href,
  external,
  children,
  variant = "primary",
  size = "md",
  className,
  ...props
}: LinkButtonProps) {
  return (
    <a
      {...props}
      href={href}
      data-variant={variant}
      data-size={size}
      className={[styles.root, className].filter(Boolean).join(" ")}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
    >
      {children}
    </a>
  );
}
