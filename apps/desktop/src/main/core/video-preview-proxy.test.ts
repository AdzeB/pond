import { expect, it } from "vitest";
import { buildVideoPreviewArguments } from "./video-preview-proxy";

it("builds a broadly Chromium-compatible H.264/AAC MP4 preview", () => {
  const args = buildVideoPreviewArguments("source.avi", "preview.mp4");

  expect(args).toContain("libx264");
  expect(args).toContain("yuv420p");
  expect(args).toContain("aac");
  expect(args).toContain("+faststart");
  expect(args.at(-1)).toBe("preview.mp4");
});
