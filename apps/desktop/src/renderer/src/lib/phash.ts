// 64-bit average hash (aHash). Returns 16 lowercase hex chars, or null if the
// image can't be decoded. Cheap, order-of-magnitude good enough for "these two
// look alike" clustering of saved media.
export async function computeAHash(src: string): Promise<string | null> {
  const img = await loadImage(src);
  if (!img) return null;
  const size = 8;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);

  const gray: number[] = [];
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) {
    const g =
      0.299 * (data[i] ?? 0) +
      0.587 * (data[i + 1] ?? 0) +
      0.114 * (data[i + 2] ?? 0);
    gray.push(g);
    sum += g;
  }
  const avg = sum / gray.length;

  let bits = "";
  for (const g of gray) bits += g >= avg ? "1" : "0";

  let hex = "";
  for (let i = 0; i < 64; i += 4) {
    hex += Number.parseInt(bits.slice(i, i + 4), 2).toString(16);
  }
  return hex;
}

export function hammingDistance(a: string, b: string): number {
  if (a.length !== b.length) return 64;
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    let x = Number.parseInt(a[i] ?? "0", 16) ^ Number.parseInt(b[i] ?? "0", 16);
    while (x) {
      dist += x & 1;
      x >>= 1;
    }
  }
  return dist;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
