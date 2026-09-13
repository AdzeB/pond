import type { CSSProperties } from "react";

export function cssVars(
  vars: Record<`--${string}`, string | number>,
): CSSProperties {
  const style: CSSProperties = {};
  Object.assign(style, vars);
  return style;
}
