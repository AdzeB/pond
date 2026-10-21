import type { Capture, RawYtdlp } from "@pond/schema/raw";
import { describe, expect, it } from "vitest";
import {
  authorFromYtdlp,
  saveAuthorFrom,
  withYtdlpAuthor,
} from "./ytdlp-author";

const AUTHORLESS_TWEET: Capture = {
  id: "2014024232317931526",
  source: "twitter",
  url: "https://x.com/jakubkrehel/status/2014024232317931526",
  media: [
    {
      url: "https://pbs.twimg.com/amplify_video_thumb/2014022060649930752/img/poster.jpg",
      type: "video",
    },
  ],
  conversationId: "2014024232317931526",
};

const TWEET_YTDLP: RawYtdlp = {
  id: "2014022060649930752",
  extractor: "twitter",
  uploader: "Jakub Krehel",
  uploader_id: "jakubkrehel",
  uploader_url: "https://twitter.com/jakubkrehel",
};

describe("authorFromYtdlp", () => {
  it("reads the uploader name, handle, and profile", () => {
    expect(authorFromYtdlp(TWEET_YTDLP)).toEqual({
      name: "Jakub Krehel",
      handle: "jakubkrehel",
      profileUrl: "https://twitter.com/jakubkrehel",
    });
  });

  it("falls back to the channel when there is no uploader", () => {
    expect(
      authorFromYtdlp({
        channel: "Some Channel",
        channel_url: "https://youtube.com/@some",
      }),
    ).toEqual({
      name: "Some Channel",
      profileUrl: "https://youtube.com/@some",
    });
  });

  it("is undefined without a name or handle", () => {
    expect(authorFromYtdlp(undefined)).toBeUndefined();
    expect(authorFromYtdlp({ uploader: "  " })).toBeUndefined();
    expect(
      authorFromYtdlp({ uploader_url: "https://x.com/someone" }),
    ).toBeUndefined();
  });
});

describe("withYtdlpAuthor", () => {
  it("names the author of a capture the page harvest left authorless", () => {
    const capture = withYtdlpAuthor(AUTHORLESS_TWEET, TWEET_YTDLP);
    expect(capture.author).toEqual({
      name: "Jakub Krehel",
      handle: "jakubkrehel",
      profileUrl: "https://twitter.com/jakubkrehel",
    });
    expect(saveAuthorFrom(capture)).toBe("Jakub Krehel");
    expect(capture.media).toBe(AUTHORLESS_TWEET.media);
  });

  it("keeps a harvested author over yt-dlp's", () => {
    const harvested: Capture = {
      ...AUTHORLESS_TWEET,
      author: { name: "Page Name", handle: "page" },
    };
    expect(withYtdlpAuthor(harvested, TWEET_YTDLP)).toBe(harvested);
  });

  it("keeps a harvested avatar when yt-dlp supplies the name", () => {
    const capture = withYtdlpAuthor(
      {
        ...AUTHORLESS_TWEET,
        author: { avatarUrl: "https://pbs.twimg.com/a.jpg" },
      },
      TWEET_YTDLP,
    );
    expect(capture.author?.avatarUrl).toBe("https://pbs.twimg.com/a.jpg");
    expect(capture.author?.name).toBe("Jakub Krehel");
  });

  it("leaves the capture authorless when yt-dlp has no uploader", () => {
    expect(withYtdlpAuthor(AUTHORLESS_TWEET, undefined)).toBe(AUTHORLESS_TWEET);
    expect(saveAuthorFrom(AUTHORLESS_TWEET)).toBeNull();
  });
});
