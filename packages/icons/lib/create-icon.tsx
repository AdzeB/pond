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
    const resolvedStroke =
      typeof strokeWidth === "number"
        ? strokeWidth
        : typeof strokeWidth === "string" && strokeWidth !== ""
          ? Number(strokeWidth)
          : (defaults?.strokeWidth ?? 1.5);
    const resolved =
      width ??
      (typeof size === "number" ? size : undefined) ??
      defaults?.size ??
      18;
    const resolvedHeight =
      height ??
      (typeof size === "number" ? size : undefined) ??
      defaults?.size ??
      18;

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
