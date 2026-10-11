import type { SVGProps } from "react";

export function IconBrandCosmos(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 370 370"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Cosmos"
      {...props}
    >
      <title>Cosmos</title>
      <rect width="370" height="370" fill="#F7F5F3" />
      {/** Round or dense mark: fits 196 instead of 206 so it matches the other tiles optically. */}
      <g transform="translate(95.81 87) scale(6.333)">
        <path
          d="M14.006 8.985a4.493 4.493 0 1 0 0-8.984 4.493 4.493 0 0 0 0 8.984Z"
          fill="#0D0D0D"
        />
        <path
          d="M14.006 30.946a4.493 4.493 0 1 0 0-8.984 4.493 4.493 0 0 0 0 8.984Z"
          fill="#0D0D0D"
        />
        <path
          d="M4.494 14.47a4.493 4.493 0 1 0 0-8.984 4.493 4.493 0 0 0 0 8.985Z"
          fill="#0D0D0D"
        />
        <path
          d="M23.522 25.453a4.493 4.493 0 1 0 0-8.984 4.493 4.493 0 0 0 0 8.984Z"
          fill="#0D0D0D"
        />
        <path
          d="M23.522 14.47a4.493 4.493 0 1 0 0-8.984 4.493 4.493 0 0 0 0 8.985Z"
          fill="#0D0D0D"
        />
        <path
          d="M4.494 25.453a4.493 4.493 0 1 0 0-8.984 4.493 4.493 0 0 0 0 8.984Z"
          fill="#0D0D0D"
        />
      </g>
    </svg>
  );
}
