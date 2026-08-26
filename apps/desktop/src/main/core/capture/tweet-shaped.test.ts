import { QUOTE_DEPTH_CAP, walkCaptureMedia } from "@pond/schema/raw";
import { describe, expect, it } from "vitest";
import { captureFromTweetShaped, type TweetShapedDraft } from "./tweet-shaped";

const parentMedia = {
  url: "https://cdn.example.com/parent.jpg",
  type: "image" as const,
  width: 800,
  height: 800,
};

const quotedMedia = {
  url: "https://cdn.example.com/quoted.jpg",
  type: "image" as const,
  width: 400,
  height: 400,
};

const quotedDraft: TweetShapedDraft = {
  source: "twitter",
  id: "2",
  url: "https://x.com/carol/status/2",
  text: "original thought",
  author: { handle: "carol", name: "Carol" },
  media: [quotedMedia],
};

const parentDraft: TweetShapedDraft = {
  source: "twitter",
  id: "1",
  url: "https://x.com/alice/status/1",
  text: "check this out",
  author: { handle: "alice", name: "Alice", verified: true },
  media: [parentMedia],
  quoted: quotedDraft,
  card: {
    url: "https://www.example.com/article",
    domain: "example.com",
    title: "An article",
  },
  metrics: { likes: 12, replies: 3 },
};

describe("captureFromTweetShaped", () => {
  it("puts quote media on the quoted Capture, not the parent", () => {
    const capture = captureFromTweetShaped(parentDraft);
    expect(capture.media.map((m) => m.url)).toEqual([parentMedia.url]);
    expect(capture.quoted?.id).toBe("2");
    expect(capture.quoted?.description).toBe("original thought");
    expect(capture.quoted?.media.map((m) => m.url)).toEqual([quotedMedia.url]);
    expect(capture.card).toMatchObject({
      url: "https://www.example.com/article",
      title: "An article",
    });
    expect(capture.author).toMatchObject({
      handle: "alice",
      verified: true,
    });
  });

  it("walks quote media for fetch and video counts", () => {
    const capture = captureFromTweetShaped(parentDraft);
    expect(walkCaptureMedia(capture).map((m) => m.url)).toEqual([
      parentMedia.url,
      quotedMedia.url,
    ]);
  });

  it("caps quote depth", () => {
    let draft: TweetShapedDraft = {
      source: "threads",
      id: "leaf",
      url: "https://www.threads.com/@z/post/leaf",
      media: [],
    };
    for (let i = 0; i < QUOTE_DEPTH_CAP + 2; i += 1) {
      draft = {
        source: "threads",
        id: `p${i}`,
        url: `https://www.threads.com/@z/post/p${i}`,
        media: [],
        quoted: draft,
      };
    }
    const capture = captureFromTweetShaped(draft);
    let depth = 0;
    let current = capture.quoted;
    while (current) {
      depth += 1;
      current = current.quoted;
    }
    expect(depth).toBe(QUOTE_DEPTH_CAP);
  });

  it("records reply fields on the Capture", () => {
    const capture = captureFromTweetShaped({
      ...parentDraft,
      quoted: undefined,
      card: undefined,
      isReply: true,
      replyingTo: "bob",
      conversationId: "99",
    });
    expect(capture.isReply).toBe(true);
    expect(capture.replyingTo).toBe("bob");
    expect(capture.conversationId).toBe("99");
    expect(capture.quoted).toBeUndefined();
    expect(capture.card).toBeUndefined();
  });
});
