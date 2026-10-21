import type { CanvasColor } from "@shared/canvas-contracts";

export const CANVAS_COLOR_LABELS = {
  white: "White",
  gray: "Gray",
  yellow: "Yellow",
  orange: "Orange",
  red: "Red",
  pink: "Pink",
  purple: "Purple",
  blue: "Blue",
  green: "Green",
} satisfies Record<CanvasColor, string>;

/** Palette dots. Light fills, so white and gray stay distinct from the ink. */
export const SWATCH = {
  white: "#ffffff",
  gray: "var(--ds-gray-6)",
  yellow: "var(--ds-yellow-6)",
  orange: "var(--ds-orange-6)",
  red: "var(--ds-red-6)",
  pink: "var(--ds-pink-6)",
  purple: "var(--ds-purple-6)",
  blue: "var(--ds-blue-6)",
  green: "var(--ds-green-6)",
} satisfies Record<CanvasColor, string>;

export const NOTE_FILL = {
  white: "#ffffff",
  gray: "var(--ds-gray-5)",
  yellow: "var(--ds-yellow-3)",
  orange: "var(--ds-orange-3)",
  red: "var(--ds-red-3)",
  pink: "var(--ds-pink-3)",
  purple: "var(--ds-purple-3)",
  blue: "var(--ds-blue-3)",
  green: "var(--ds-green-3)",
} satisfies Record<CanvasColor, string>;

export const FIGURE_EDGE = {
  white: "var(--ds-gray-7)",
  gray: "var(--ds-gray-8)",
  yellow: "var(--ds-yellow-8)",
  orange: "var(--ds-orange-8)",
  red: "var(--ds-red-8)",
  pink: "var(--ds-pink-8)",
  purple: "var(--ds-purple-8)",
  blue: "var(--ds-blue-8)",
  green: "var(--ds-green-8)",
} satisfies Record<CanvasColor, string>;

export const INK = {
  white: "#ffffff",
  gray: "var(--ds-gray-12)",
  yellow: "var(--ds-yellow-9)",
  orange: "var(--ds-orange-9)",
  red: "var(--ds-red-9)",
  pink: "var(--ds-pink-9)",
  purple: "var(--ds-purple-9)",
  blue: "var(--ds-blue-9)",
  green: "var(--ds-green-9)",
} satisfies Record<CanvasColor, string>;
