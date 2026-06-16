import type { ComponentPropsWithoutRef, ElementType } from "react";
import styles from "./glass.module.css";

export type GlassVariant = "pill" | "card";

type GlassProps<T extends ElementType> = {
  // Element to render. Defaults to a <div>; pass e.g. `as="nav"` for semantics.
  as?: T;
  // `pill` (fully rounded chrome) or `card` (gently rounded surfaces/popups).
  variant?: GlassVariant;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className">;

// Reusable frosted surface. Wrap any cluster of content to give it the
// translucent tint, backdrop frost, and convex shine in one place — the JSX
// counterpart to composing the `pill`/`card` class from glass.module.css.
//
// Keep it to ONE layer: don't nest a <Glass> inside another (or over a surface
// that's already frosted), since stacked backdrop filters muddy and jitter.
export function Glass<T extends ElementType = "div">({
  as,
  variant = "pill",
  className,
  ...props
}: GlassProps<T>) {
  const Component = as ?? "div";
  return (
    <Component
      className={[styles[variant], className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}
