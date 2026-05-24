import type { ComponentType } from "react";

/**
 * Structural type for any icon component shipped through `@pond/icons`.
 *
 * Lucide narrows some SVG attrs in `LucideProps` (and our local brand
 * glyphs are plain `SVGProps<SVGSVGElement>`), which means a Lucide
 * icon is not directly assignable to React's broadest
 * `ComponentType<SVGProps<...>>`. We dodge the variance trap by typing
 * the slot as "a component that accepts the props we actually pass in
 * app code": `width`, `height`, `className`, and `aria-hidden`.
 * Consumers that need more (e.g. `strokeWidth`) should use the concrete
 * icon type at the point of use instead of going through this
 * lowest-common-denominator type.
 */
export type IconComponent = ComponentType<{
  width?: number | string;
  height?: number | string;
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}>;
