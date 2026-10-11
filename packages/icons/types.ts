import type { FunctionComponent, SVGProps } from "react";

export interface IconProps extends SVGProps<SVGSVGElement> {
  /** Rendered width and height. Numbers are pixels. */
  size?: number | string;
  /** On-screen stroke in pixels at 18px and below; scales with the glyph above 18px. */
  strokeWidth?: number | string;
  title?: string;
}

export type IconComponent = FunctionComponent<IconProps>;

export type IconStyle = "outline" | "fill";

export type IconNode = readonly (readonly [
  string,
  Readonly<Record<string, string>>,
])[];

export type IconManifest = Readonly<Record<string, readonly IconStyle[]>>;
