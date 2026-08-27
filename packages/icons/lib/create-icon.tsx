import type { JSX, ReactNode, SVGProps } from "react";

type IconInner = (props: { strokeWidth?: number }) => ReactNode;

type IconDefaults = {
  strokeWidth?: number;
  size?: number;
};

export function createIcon(
  inner: IconInner,
  defaults?: IconDefaults,
): (
  props: SVGProps<SVGSVGElement> & { size?: number | string },
) => JSX.Element {
  const viewBoxSize = defaults?.size ?? 18;

  return function Icon({
    strokeWidth,
    size,
    width,
    height,
    ...props
  }: SVGProps<SVGSVGElement> & { size?: number | string }) {
    const strokeNumber = Number(strokeWidth ?? "");
    const resolvedStroke = Number.isFinite(strokeNumber)
      ? strokeNumber
      : (defaults?.strokeWidth ?? 1.5);
    const fallbackSize = size ?? defaults?.size ?? 18;
    const resolved = width ?? fallbackSize;
    const resolvedHeight = height ?? fallbackSize;

    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
        width={resolved}
        height={resolvedHeight}
        fill="none"
        {...props}
      >
        {inner({
          strokeWidth: Number.isFinite(resolvedStroke)
            ? resolvedStroke
            : (defaults?.strokeWidth ?? 1.5),
        })}
      </svg>
    );
  };
}
