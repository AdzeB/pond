export interface CaptureRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function cropRectangle(
  rect: CaptureRectangle,
  logical: { width: number; height: number },
  pixels: { width: number; height: number },
) {
  const left = Math.max(
    0,
    Math.min(
      pixels.width - 1,
      Math.floor((rect.x * pixels.width) / logical.width),
    ),
  );
  const top = Math.max(
    0,
    Math.min(
      pixels.height - 1,
      Math.floor((rect.y * pixels.height) / logical.height),
    ),
  );
  const right = Math.max(
    left + 1,
    Math.min(
      pixels.width,
      Math.ceil(((rect.x + rect.width) * pixels.width) / logical.width),
    ),
  );
  const bottom = Math.max(
    top + 1,
    Math.min(
      pixels.height,
      Math.ceil(((rect.y + rect.height) * pixels.height) / logical.height),
    ),
  );
  return { left, top, width: right - left, height: bottom - top };
}
