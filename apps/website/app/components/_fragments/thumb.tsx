import type { CSSProperties } from "react";

const PALETTE = [
  ["#dfe5dc", "#a8b3a0"],
  ["#e6dfd5", "#b5a994"],
  ["#dde0e6", "#9ea7b5"],
  ["#e6dadd", "#b59aa0"],
  ["#dce6e1", "#94b3a8"],
  ["#e2deea", "#a39ab8"],
  ["#e6e2d3", "#b8b18e"],
  ["#d8e2e3", "#92aaad"],
] as const;

interface ThumbProps {
  seed: number;
  aspect?: number;
  label?: string;
}

export function Thumb({ seed, aspect = 1, label }: ThumbProps) {
  const palette = PALETTE[seed % PALETTE.length] ?? PALETTE[0];
  const [light, dark] = palette;
  const angle = (seed * 37) % 360;
  const offset = ((seed * 13) % 60) - 30;

  const style: CSSProperties = {
    aspectRatio: String(aspect),
    background: `linear-gradient(${angle}deg, ${light} 0%, ${dark} 110%)`,
  };

  const overlayStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    background: `radial-gradient(circle at ${50 + offset}% ${50 - offset}%, transparent 0%, rgba(0, 0, 0, 0.18) 100%)`,
    mixBlendMode: "multiply",
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        overflow: "hidden",
        borderRadius: 6,
        ...style,
      }}
      {...(label
        ? { role: "img", "aria-label": label }
        : { "aria-hidden": true })}
    >
      <div style={overlayStyle} aria-hidden />
    </div>
  );
}
