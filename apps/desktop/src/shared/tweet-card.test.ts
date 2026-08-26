import { describe, expect, it } from "vitest";
import { buildTweetCardData } from "./tweet-card";

describe("buildTweetCardData", () => {
  it("drops blob: video posters so the native card does not paint a dead tile", () => {
    const data = buildTweetCardData({
      id: "1",
      source: "twitter",
      url: "https://x.com/a/status/1",
      media: [
        {
          url: "blob:https://x.com/poster",
          type: "video",
          posterUrl: "blob:https://x.com/poster",
          durationSec: 10,
          width: 1280,
          height: 720,
        },
      ],
    });
    expect(data?.media).toEqual([
      {
        url: "blob:https://x.com/poster",
        type: "video",
        durationSec: 10,
        width: 1280,
        height: 720,
      },
    ]);
  });

  it("keeps http video posters", () => {
    const data = buildTweetCardData({
      id: "1",
      source: "twitter",
      url: "https://x.com/a/status/1",
      media: [
        {
          url: "https://video.twimg.com/clip.mp4",
          type: "video",
          posterUrl: "https://pbs.twimg.com/thumb.jpg",
        },
      ],
    });
    expect(data?.media?.[0]).toMatchObject({
      type: "video",
      posterUrl: "https://pbs.twimg.com/thumb.jpg",
    });
  });
});
