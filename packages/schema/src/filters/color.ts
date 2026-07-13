export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function parseHex(hex: string): Rgb | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m?.[1]) return null;
  const n = Number.parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** Tolerance for squared Euclidean distance in RGB; 60 is a moderate match. */
export const DEFAULT_COLOR_TOLERANCE = 60;

export function colorNear(
  targetHex: string,
  palette: ReadonlyArray<string>,
  tolerance = DEFAULT_COLOR_TOLERANCE,
): boolean {
  const target = parseHex(targetHex);
  if (!target) return false;
  const tol2 = tolerance * tolerance;
  for (const hex of palette) {
    const c = parseHex(hex);
    if (!c) continue;
    const dr = c.r - target.r;
    const dg = c.g - target.g;
    const db = c.b - target.b;
    if (dr * dr + dg * dg + db * db <= tol2) return true;
  }
  return false;
}

/** Named swatches for the filter UI. */
export const COLOR_PRESETS: ReadonlyArray<{ label: string; hex: string }> = [
  { label: "Red", hex: "#e5484d" },
  { label: "Orange", hex: "#f76b15" },
  { label: "Yellow", hex: "#ffe629" },
  { label: "Green", hex: "#30a46c" },
  { label: "Teal", hex: "#12a594" },
  { label: "Blue", hex: "#0091ff" },
  { label: "Purple", hex: "#8e4ec6" },
  { label: "Pink", hex: "#e93d82" },
  { label: "Brown", hex: "#ad7f58" },
  { label: "Gray", hex: "#8d8d8d" },
  { label: "Black", hex: "#1a1a1a" },
  { label: "White", hex: "#fafafa" },
];
