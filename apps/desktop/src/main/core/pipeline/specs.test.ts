import { describe, expect, it } from "vitest";
import { countCaptureVideos, expectedVideoDownloads, planOps } from "./specs";

describe("planOps", () => {
  it("captures Threads posts like tweets and skips text covers", () => {
    const ops = planOps("threads");
    expect(ops).toContain("capture_tweet");
    expect(ops).not.toContain("render_text_cover");
    expect(ops).not.toContain("archive_page");
    expect(planOps("twitter")).toEqual(ops);
  });
});

describe("expectedVideoDownloads", () => {
  it("counts every capture.media video, including quoted clips", () => {
    expect(
      countCaptureVideos({
        capture: {
          media: [
            { type: "video", url: "https://video.twimg.com/a.mp4" },
            { type: "image", url: "https://pbs.twimg.com/b.jpg" },
          ],
          quoted: {
            id: "q",
            source: "twitter",
            url: "https://x.com/b/status/2",
            media: [{ type: "video", url: "https://video.twimg.com/c.mp4" }],
          },
        },
      }),
    ).toBe(2);
    expect(
      expectedVideoDownloads({
        mediaType: "video",
        rawJson: {
          capture: {
            media: [{ type: "video", url: "https://video.twimg.com/a.mp4" }],
            quoted: {
              id: "q",
              source: "twitter",
              url: "https://x.com/b/status/2",
              media: [{ type: "video", url: "https://video.twimg.com/c.mp4" }],
            },
          },
        },
      }),
    ).toBe(2);
  });

  it("falls back to one when mediaType is video and capture lists none", () => {
    expect(expectedVideoDownloads({ mediaType: "video", rawJson: {} })).toBe(1);
    expect(expectedVideoDownloads({ mediaType: "image", rawJson: {} })).toBe(0);
  });
});
