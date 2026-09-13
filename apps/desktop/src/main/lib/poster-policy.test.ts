import type { SaveFile } from "@pond/schema/db";
import { storedAsRawJson } from "@pond/schema/raw-schema";
import { describe, expect, it } from "vitest";
import {
  needsPosterRepair,
  posterFilename,
  posterRepairIndexes,
  usesPlatformPoster,
  videoFilename,
  youtubeThumbnailUrl,
} from "./poster-policy";

function file(
  kind: SaveFile["kind"],
  path: string,
  dims?: { width: number; height: number },
): SaveFile {
  const file: SaveFile = {
    kind,
    path,
    sha256: "",
    size: 0,
    mimeType: kind === "video" ? "video/mp4" : "image/jpeg",
  };
  if (dims) {
    file.width = dims.width;
    file.height = dims.height;
  }
  return file;
}

describe("usesPlatformPoster", () => {
  it("is true only for youtube", () => {
    expect(usesPlatformPoster("youtube")).toBe(true);
    expect(usesPlatformPoster("tiktok")).toBe(false);
    expect(usesPlatformPoster(null)).toBe(false);
  });
});

describe("media filenames", () => {
  it("numbers the first slot from 1", () => {
    expect(videoFilename(0, ".mp4")).toBe("video-1.mp4");
    expect(videoFilename(1, ".mp4")).toBe("video-2.mp4");
    expect(posterFilename(0, ".jpg")).toBe("poster-1.jpg");
    expect(posterFilename(1, ".jpg")).toBe("poster-2.jpg");
  });
});

describe("needsPosterRepair", () => {
  it("repairs missing posters", () => {
    expect(needsPosterRepair([file("video", "video.mp4")])).toBe(true);
  });

  it("keeps existing posters even when aspects disagree", () => {
    expect(
      needsPosterRepair([
        file("video", "video.mp4", { width: 1080, height: 1920 }),
        file("poster", "poster.jpg", { width: 1280, height: 720 }),
      ]),
    ).toBe(false);
  });

  it("keeps undimmed existing posters", () => {
    expect(
      needsPosterRepair([
        file("video", "video.mp4"),
        file("poster", "poster.jpg"),
      ]),
    ).toBe(false);
  });

  it("returns only missing poster indexes", () => {
    expect(
      posterRepairIndexes([
        file("video", "a.mp4", { width: 1920, height: 1080 }),
        file("video", "b.mp4", { width: 1080, height: 1920 }),
        file("poster", "poster.jpg", { width: 1280, height: 720 }),
      ]),
    ).toEqual([1]);
  });
});

describe("youtubeThumbnailUrl", () => {
  it("prefers ytdlp thumbnail then capture posterUrl", () => {
    expect(
      youtubeThumbnailUrl(
        storedAsRawJson({
          ytdlp: { thumbnail: "https://i.ytimg.com/vi/x/hqdefault.jpg" },
        }),
      ),
    ).toBe("https://i.ytimg.com/vi/x/hqdefault.jpg");
    expect(
      youtubeThumbnailUrl(
        storedAsRawJson({
          capture: {
            media: [
              {
                url: "https://video.example/y.mp4",
                type: "video",
                posterUrl: "https://i.ytimg.com/vi/y/hqdefault.jpg",
              },
            ],
          },
        }),
      ),
    ).toBe("https://i.ytimg.com/vi/y/hqdefault.jpg");
  });
});
