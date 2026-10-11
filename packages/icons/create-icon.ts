import { createElement } from "react";
import type { IconComponent, IconNode, IconProps, IconStyle } from "./types";

const GRID = 18;
const STROKE = 1.5;

/** Converts on-screen pixels at `size` to viewBox units: held up to the 18px grid, then grown with the glyph. */
function strokeUnits(stroke: number | string, size: number | string) {
  const pixels = Number.isFinite(Number(stroke)) ? Number(stroke) : STROKE;
  const rendered = Number(size);
  if (!(rendered > 0) || rendered > GRID) return pixels;
  return (pixels * GRID) / rendered;
}

export function createIcon(
  glyph: string,
  style: IconStyle,
  nodes: IconNode,
): IconComponent {
  function Icon({
    size = GRID,
    strokeWidth = STROKE,
    title,
    children: extra,
    ...props
  }: IconProps) {
    const paint =
      style === "outline"
        ? {
            fill: "none",
            stroke: "currentColor",
            strokeLinecap: "round" as const,
            strokeLinejoin: "round" as const,
            strokeWidth: strokeUnits(strokeWidth, size),
          }
        : { fill: "currentColor" };
    return createElement(
      "svg",
      {
        "aria-hidden": title ? undefined : true,
        height: size,
        role: title ? "img" : undefined,
        viewBox: `0 0 ${GRID} ${GRID}`,
        width: size,
        xmlns: "http://www.w3.org/2000/svg",
        ...paint,
        ...props,
      },
      title ? createElement("title", null, title) : null,
      ...nodes.map(([tag, attrs], index) =>
        createElement(tag, { key: index, ...attrs }),
      ),
      extra,
    );
  }
  Icon.displayName = `Icon${glyph}${style === "fill" ? "Fill" : ""}`;
  return Icon;
}
