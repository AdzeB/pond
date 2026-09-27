import { describe, expect, it } from "vitest";
import { parseFfmpegMetadata } from "./media-metadata";

describe("parseFfmpegMetadata", () => {
  it("reads container, codecs, bitrate, and color space", () => {
    const output = `
Input #0, mov,mp4,m4a,3gp,3g2,mj2, from 'clip.mp4':
  Duration: 00:00:10.00, start: 0.000000, bitrate: 1420 kb/s
  Stream #0:0: Video: h264 (High), yuv420p(tv, bt709), 1920x1080
  Stream #0:1: Audio: aac (LC), 48000 Hz, stereo
`;
    expect(parseFfmpegMetadata(output)).toEqual({
      container: "mov",
      videoCodec: "h264",
      audioCodec: "aac",
      bitrate: 1_420_000,
      colorSpace: "bt709",
    });
  });
});
