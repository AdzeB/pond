import { createElement } from "react";
import type { IconComponent, IconNode, IconProps, IconStyle } from "./types";

const GRID = 18;
const STROKE = 1.5;

/** Holds the pixel weight up to the 18px grid, then grows with the glyph. */
function strokePixels(stroke: number | string, size: number | string) {
  const pixels = Number.isFinite(Number(stroke)) ? Number(stroke) : STROKE;
  const rendered = Number(size);
  return rendered > GRID ? (pixels * rendered) / GRID : pixels;
}

export function createIcon(
  glyph: string,
  style: IconStyle,
  nodes: IconNode,
): IconComponent {
  /** Non-scaling strokes stay in screen pixels when CSS, not `size`, sets the box. */
  const children =
    style === "outline"
      ? nodes.map(
          ([tag, attrs]) =>
            [tag, { ...attrs, vectorEffect: "non-scaling-stroke" }] as const,
        )
      : nodes;

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
            strokeWidth: strokePixels(strokeWidth, size),
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
      ...children.map(([tag, attrs], index) =>
        createElement(tag, { key: index, ...attrs }),
      ),
      extra,
    );
  }
  Icon.displayName = `Icon${glyph}${style === "fill" ? "Fill" : ""}`;
  return Icon;
}
