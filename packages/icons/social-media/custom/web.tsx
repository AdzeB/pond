import type { SVGProps } from "react";

export function IconSourceWeb(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 370 370"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Web"
      {...props}
    >
      <title>Web</title>
      <rect width="370" height="370" fill="#0A84FF" />
      {/** Round mark: fits 196 instead of 206 so it matches the other tiles optically. */}
      <g stroke="white" strokeWidth="18">
        <circle cx="185" cy="185" r="89" />
        <ellipse cx="185" cy="185" rx="40" ry="89" />
        <path d="M96 185H274M108.8 139H261.2M108.8 231H261.2" />
      </g>
    </svg>
  );
}
