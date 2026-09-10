import { expect, it } from "vitest";
import { srtToVtt } from "./subtitles";

it("writes a WEBVTT file with dot milliseconds", () => {
  const srt = `1
00:00:01,000 --> 00:00:02,500
Hello

2
00:00:03,000 --> 00:00:04,000
There
`;
  const vtt = srtToVtt(srt);
  expect(vtt.startsWith("WEBVTT\n\n")).toBe(true);
  expect(vtt).toContain("00:00:01.000 --> 00:00:02.500");
  expect(vtt).not.toContain("00:00:01,000");
});

it("leaves an existing VTT file alone", () => {
  const vtt = "WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nHi\n";
  expect(srtToVtt(vtt)).toBe(vtt);
});
