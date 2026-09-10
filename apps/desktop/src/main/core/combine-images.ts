import sharp from "sharp";

const COMBINABLE = new Set(["image/jpeg", "image/jpg", "image/png"]);

export function isCombinableImage(
  mimeType: string | null | undefined,
  path: string,
): boolean {
  const mime = mimeType?.trim().toLowerCase() ?? "";
  if (COMBINABLE.has(mime)) return true;
  const lower = path.toLowerCase();
  return (
    lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png")
  );
}

export async function joinRasterImages(paths: string[]): Promise<Buffer> {
  if (paths.length < 2) {
    throw new Error("Select at least two JPG or PNG images.");
  }
  const sources = await Promise.all(
    paths.map(async (path) => {
      const image = sharp(path).rotate();
      const meta = await image.metadata();
      return { path, width: meta.width ?? 1, height: meta.height ?? 1 };
    }),
  );
  const height = Math.max(...sources.map((source) => source.height));
  const resized = await Promise.all(
    sources.map(async (source) => {
      const width = Math.round(source.width * (height / source.height));
      return sharp(source.path)
        .rotate()
        .resize({ width, height })
        .ensureAlpha()
        .png()
        .toBuffer({ resolveWithObject: true });
    }),
  );
  const width = resized.reduce((sum, item) => sum + item.info.width, 0);
  const composites = [];
  let left = 0;
  for (const item of resized) {
    composites.push({ input: item.data, left, top: 0 });
    left += item.info.width;
  }
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png()
    .toBuffer();
}
