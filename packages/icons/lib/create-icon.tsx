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
  props: SVGProps<SVGSVGElement> & {
    strokeWidth?: number;
    size?: number | string;
  },
) => JSX.Element {
  return function Icon({
    strokeWidth = defaults?.strokeWidth ?? 1.5,
    size,
    width,
    height,
    ...props
  }) {
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
        viewBox="0 0 18 18"
        width={resolved}
        height={resolvedHeight}
        fill="none"
        {...props}
      >
        {inner({ strokeWidth })}
      </svg>
    );
  };
}
