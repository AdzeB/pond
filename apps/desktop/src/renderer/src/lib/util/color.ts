// Pure colour-space conversions for the swatch copy menu. Mirrors the formats
// Eagle exposes (hex / rgb / rgba / hsl / hsv / hwb / cmyk) so a dominant colour
// can be lifted into whatever space the user's tool of choice expects.

interface Rgb {
  r: number;
  g: number;
  b: number;
}

// Accepts #rgb, #rrggbb (with or without the leading #). Returns null on junk so
// callers can skip rendering rather than copy a malformed value.
function parseHex(input: string): Rgb | null {
  const t = input.trim().replace(/^#/, "");
  const short = /^([0-9a-f]{3})$/i.exec(t);
  if (short) {
    const [r, g, b] = short[1] as string;
    return {
      r: Number.parseInt(`${r}${r}`, 16),
      g: Number.parseInt(`${g}${g}`, 16),
      b: Number.parseInt(`${b}${b}`, 16),
    };
  }
  const full = /^([0-9a-f]{6})$/i.exec(t);
  if (full) {
    const hex = full[1] as string;
    return {
      r: Number.parseInt(hex.slice(0, 2), 16),
      g: Number.parseInt(hex.slice(2, 4), 16),
      b: Number.parseInt(hex.slice(4, 6), 16),
    };
  }
  return null;
}

function normalizeHex(input: string): string {
  const rgb = parseHex(input);
  if (!rgb) return input;
  const hex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${hex(rgb.r)}${hex(rgb.g)}${hex(rgb.b)}`;
}

function hue(
  r: number,
  g: number,
  b: number,
  max: number,
  delta: number,
): number {
  if (delta === 0) return 0;
  let h: number;
  if (max === r) h = ((g - b) / delta) % 6;
  else if (max === g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;
  h = Math.round(h * 60);
  return h < 0 ? h + 360 : h;
}

function toHsl({ r, g, b }: Rgb): string {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const delta = max - min;
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  return `hsl(${hue(rr, gg, bb, max, delta)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

function toHsv({ r, g, b }: Rgb): string {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const delta = max - min;
  const s = max === 0 ? 0 : delta / max;
  return `hsv(${hue(rr, gg, bb, max, delta)}, ${Math.round(s * 100)}%, ${Math.round(max * 100)}%)`;
}

function toHwb({ r, g, b }: Rgb): string {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const delta = max - min;
  return `hwb(${hue(rr, gg, bb, max, delta)}, ${Math.round(min * 100)}%, ${Math.round((1 - max) * 100)}%)`;
}

function toCmyk({ r, g, b }: Rgb): string {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const k = 1 - Math.max(rr, gg, bb);
  const f = (v: number) => (k === 1 ? 0 : (1 - v - k) / (1 - k));
  return `cmyk(${Math.round(f(rr) * 100)}%, ${Math.round(f(gg) * 100)}%, ${Math.round(f(bb) * 100)}%, ${Math.round(k * 100)}%)`;
}

interface ColorFormat {
  label: string;
  value: string;
}

// The copy options shown in the swatch menu, grouped the way Eagle groups them:
// the everyday spaces first, then the print/specialist trio.
export function colorCopyFormats(
  input: string,
): { primary: ColorFormat[]; secondary: ColorFormat[] } | null {
  const rgb = parseHex(input);
  if (!rgb) return null;
  const hex = normalizeHex(input);
  return {
    primary: [
      { label: hex, value: hex },
      {
        label: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
        value: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
      },
      {
        label: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`,
        value: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`,
      },
      { label: toHsl(rgb), value: toHsl(rgb) },
    ],
    secondary: [
      { label: toHsv(rgb), value: toHsv(rgb) },
      { label: toHwb(rgb), value: toHwb(rgb) },
      { label: toCmyk(rgb), value: toCmyk(rgb) },
    ],
  };
}
