import type { SVGProps } from "react";

export function IconBrandYoutube(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 370 370"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Youtube"
      {...props}
    >
      <title>Youtube</title>
      <rect width="370" height="370" fill="#FF0000" />
      {/** Centered on the triangle's centroid, not its bounding box, so the play mark reads centered. */}
      <g transform="translate(-62.74 -64.08) scale(1.3464)">
        <path d="M142 108.5v153L268 185 142 108.5z" fill="#fff" />
      </g>
    </svg>
  );
}
