import sharp from "sharp";

export async function gifFramePng(
  source: string | Buffer,
  frameIndex: number,
): Promise<Buffer> {
  const page = Math.max(0, Math.floor(frameIndex));
  return sharp(source, { pages: 1, page }).png().toBuffer();
}
