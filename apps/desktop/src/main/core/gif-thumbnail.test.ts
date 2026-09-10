import sharp from "sharp";
import { expect, it } from "vitest";
import { gifFramePng } from "./gif-thumbnail";

it("exports the requested GIF frame as PNG without changing source bytes", async () => {
  const pixels = Buffer.from([
    ...Array.from({ length: 4 }, () => [255, 0, 0]).flat(),
    ...Array.from({ length: 4 }, () => [0, 0, 255]).flat(),
  ]);
  const gif = await sharp(pixels, {
    raw: { width: 2, height: 4, channels: 3, pageHeight: 2 },
  })
    .gif({ delay: [100, 200] })
    .toBuffer();
  const original = Buffer.from(gif);
  const png = await gifFramePng(gif, 1);
  const output = await sharp(png).removeAlpha().raw().toBuffer();
  expect([...output.subarray(0, 3)]).toEqual([0, 0, 255]);
  expect(gif).toEqual(original);
});
