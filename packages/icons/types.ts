import type { ComponentType } from "react";

// Lowest-common-denominator icon slot type; use concrete icon types for more props.
export type IconComponent = ComponentType<{
  width?: number | string;
  height?: number | string;
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}>;
