import type { SVGProps } from "react";

interface MarkProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

export function Mark({ size = 18, ...props }: MarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label="Pond"
      {...props}
    >
      <title>Pond</title>
      <circle cx="16" cy="16" r="6" stroke="currentColor" strokeWidth="2" />
      <circle
        cx="16"
        cy="16"
        r="10"
        stroke="currentColor"
        strokeOpacity="0.5"
        strokeWidth="1"
      />
      <circle
        cx="16"
        cy="16"
        r="13.5"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="1"
      />
    </svg>
  );
}

export function Wordmark({ size = 16 }: { size?: number }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        fontSize: `${size}px`,
        fontWeight: 550,
        letterSpacing: "-0.01em",
        color: "var(--ds-gray-12)",
      }}
    >
      <Mark size={size + 4} />
      Pond
    </span>
  );
}
