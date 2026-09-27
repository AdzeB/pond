import sharp from "sharp";

export async function encodePhash(
  source: string | Buffer,
): Promise<string | null> {
  try {
    const pixels = await sharp(source)
      .resize(9, 8, { fit: "fill" })
      .greyscale()
      .raw()
      .toBuffer();
    let bits = 0n;
    let index = 0;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const left = pixels[y * 9 + x] ?? 0;
        const right = pixels[y * 9 + x + 1] ?? 0;
        if (left > right) bits |= 1n << BigInt(63 - index);
        index += 1;
      }
    }
    return bits.toString(16).padStart(16, "0");
  } catch {
    return null;
  }
}
