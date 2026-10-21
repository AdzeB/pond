import { DEFAULT_VIDEO_DOWNLOAD } from "@pond/schema/db";
import { storedAsRawJson } from "@pond/schema/raw-schema";
import { describe, expect, it, vi } from "vitest";
import { TransientError } from "../extractors/errors";
import {
  runFetchVideoYtdlp,
  type VideoDownloadSave,
} from "./fetch-video-ytdlp";

const videoSave: VideoDownloadSave = {
  source: "youtube",
  url: "https://www.youtube.com/watch?v=yt1",
  accountId: null,
  author: null,
  mediaType: "video",
  files: [],
  rawJson: storedAsRawJson({
    capture: {
      media: [{ type: "video", url: "https://www.youtube.com/watch?v=yt1" }],
    },
  }),
};

function setup(autoDownload: boolean) {
  const downloadVideo = vi.fn(async () => null);
  const getVideoDownloadPrefs = vi.fn(async () => ({
    ...DEFAULT_VIDEO_DOWNLOAD,
    autoDownload,
  }));
  const runtime = {
    readSave: async () => videoSave,
    getVideoDownloadPrefs,
    downloadVideo,
    isAutoVideoBlockedByStorageGuard: () => false,
  };
  return { runtime, downloadVideo, getVideoDownloadPrefs };
}

describe("fetch_video_ytdlp download gate", () => {
  it("skips yt-dlp when auto-download is off for the source", async () => {
    const { runtime, downloadVideo, getVideoDownloadPrefs } = setup(false);

    await expect(
      runFetchVideoYtdlp("yt1", {}, undefined, runtime),
    ).resolves.toBeUndefined();
    expect(downloadVideo).not.toHaveBeenCalled();
    expect(getVideoDownloadPrefs).toHaveBeenCalledWith("youtube");
  });

  it("downloads when you request it, even with auto-download off", async () => {
    const { runtime, downloadVideo } = setup(false);

    await expect(
      runFetchVideoYtdlp("yt1", { requested: true }, undefined, runtime),
    ).rejects.toThrow(TransientError);
    expect(downloadVideo).toHaveBeenCalledOnce();
  });

  it("downloads automatically when auto-download is on", async () => {
    const { runtime, downloadVideo } = setup(true);

    await expect(
      runFetchVideoYtdlp("yt1", {}, undefined, runtime),
    ).rejects.toThrow(TransientError);
    expect(downloadVideo).toHaveBeenCalledOnce();
  });
});
