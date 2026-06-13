import sharp from "sharp";

// Top-N dominant colors as #rrggbb, most frequent first; [] if undecodable.
export async function extractPalette(
  path: string,
  count = 5,
): Promise<string[]> {
  try {
    const size = 32;
    const { data, info } = await sharp(path)
      .resize(size, size, { fit: "inside" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const channels = info.channels;
    const buckets = new Map<
      string,
      { count: number; r: number; g: number; b: number }
    >();
    for (let i = 0; i + channels - 1 < data.length; i += channels) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (r === undefined || g === undefined || b === undefined) continue;
      // Quantize to a 4-bit-per-channel grid to merge near-identical pixels.
      const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
      const entry = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
      entry.count++;
      entry.r += r;
      entry.g += g;
      entry.b += b;
      buckets.set(key, entry);
    }

    return Array.from(buckets.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, count)
      .map((e) =>
        toHex(
          Math.round(e.r / e.count),
          Math.round(e.g / e.count),
          Math.round(e.b / e.count),
        ),
      );
  } catch {
    return [];
  }
}

function toHex(r: number, g: number, b: number): string {
  const h = (n: number) => n.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}
