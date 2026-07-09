import type { ComponentType, SVGProps } from "react";

// Lowest-common-denominator icon slot type; use concrete icon types for more props.
export type IconComponent = ComponentType<
  SVGProps<SVGSVGElement> & {
    size?: number | string;
    strokeWidth?: number;
  }
>;
