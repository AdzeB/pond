import type { SVGProps } from "react";

export function IconSourceLocal(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 370 370"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Local"
      {...props}
    >
      <title>Local</title>
      <rect width="370" height="370" fill="#8E8E93" />
      <path
        d="M100 105H143C150 105 155 107 160 112L169 121C172 124 175 125 180 125H270C280 125 288 133 288 143V230H82V123C82 113 90 105 100 105Z"
        fill="white"
        fillOpacity="0.55"
      />
      <rect x="82" y="145" width="206" height="120" rx="18" fill="white" />
    </svg>
  );
}
