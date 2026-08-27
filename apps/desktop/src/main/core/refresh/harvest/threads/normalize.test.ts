import { describe, expect, it } from "vitest";
import { adapt } from "./item";
import {
  inPageThreadsNormalize,
  isLandingOgThreadsSave,
  isThreadsLandingCopy,
  isThreadsLandingMedia,
} from "./normalize";

describe("threads landing filters", () => {
  it("rejects the brand OG tile", () => {
    expect(
      isThreadsLandingMedia(
        "https://static.cdninstagram.com/rsrc.php/yd/r/kHwIMM5b8PW.webp",
      ),
    ).toBe(true);
    expect(
      isThreadsLandingMedia(
        "https://instagram.fdub8-1.fna.fbcdn.net/v/t51.82787-15/774099908_n.jpg",
      ),
    ).toBe(false);
  });

  it("rejects the unhydrated shell copy", () => {
    expect(
      isThreadsLandingCopy(
        "Join Threads to share ideas, ask questions, post random thoughts, find your people and more. Log in with your Instagram.",
      ),
    ).toBe(true);
    expect(isThreadsLandingCopy("Threads • Log in")).toBe(true);
    expect(isThreadsLandingCopy("lately ୧(•.•)୨")).toBe(false);
  });

  it("drops landing OG from adapt so a failed hydrate cannot enqueue the logo tile", () => {
    const harvest = adapt(
      {
        description:
          "Join Threads to share ideas, ask questions, post random thoughts, find your people and more. Log in with your Instagram.",
        mediaUrl:
          "https://static.cdninstagram.com/rsrc.php/yd/r/kHwIMM5b8PW.webp",
        mediaUrls: [
          {
            url: "https://static.cdninstagram.com/rsrc.php/yd/r/kHwIMM5b8PW.webp",
            type: "image",
          },
        ],
      },
      { source: "threads", url: "https://www.threads.com/t/x", sourceId: "x" },
    );
    expect(harvest).toBeNull();
  });

  it("keeps a real post", () => {
    const harvest = adapt(
      {
        title: "lately ୧(•.•)୨",
        description: "lately ୧(•.•)୨",
        author: "@gianniijones",
        mediaUrl:
          "https://instagram.fdub8-1.fna.fbcdn.net/v/t51.82787-15/a.jpg",
        mediaUrls: [
          {
            url: "https://instagram.fdub8-1.fna.fbcdn.net/v/t51.82787-15/a.jpg",
            type: "image",
          },
        ],
      },
      {
        source: "threads",
        url: "https://www.threads.com/@gianniijones/post/abc",
        sourceId: "abc",
      },
    );
    expect(harvest?.title).toBe("lately ୧(•.•)୨");
    expect(harvest?.media).toHaveLength(1);
  });
});

describe("threads extras from text_post_app_info", () => {
  it("maps quoted posts, link previews, and replies", () => {
    const { normalizeMediaNode } = inPageThreadsNormalize();
    const out = normalizeMediaNode({
      code: "ParentCode01",
      media_type: 1,
      like_count: 12,
      caption: { text: "check this out" },
      user: {
        username: "alice",
        full_name: "Alice",
        profile_pic_url: "https://example.com/a.jpg",
        is_verified: true,
      },
      image_versions2: {
        candidates: [
          {
            url: "https://cdn.example.com/parent.jpg",
            width: 800,
            height: 800,
          },
        ],
      },
      text_post_app_info: {
        direct_reply_count: 3,
        quote_count: 1,
        repost_count: 2,
        is_reply: true,
        reply_to_author: { username: "bob" },
        share_info: {
          quoted_post: {
            code: "QuotedCode01",
            caption: { text: "original thought" },
            user: {
              username: "carol",
              full_name: "Carol",
              profile_pic_url: "https://example.com/c.jpg",
            },
            image_versions2: {
              candidates: [
                {
                  url: "https://cdn.example.com/quoted.jpg",
                  width: 400,
                  height: 400,
                },
              ],
            },
          },
        },
        link_preview_attachment: {
          url: "https://www.example.com/article",
          display_url: "example.com",
          title: "An article",
          description: "About something",
          image_url: "https://cdn.example.com/og.jpg",
        },
      },
    });
    expect(out).not.toBeNull();
    const meta = out?.meta;
    expect(meta?.quotedTweet).toMatchObject({
      tweetId: "QuotedCode01",
      url: "https://www.threads.com/@carol/post/QuotedCode01",
      author: "@carol",
      authorName: "Carol",
      text: "original thought",
    });
    expect(meta?.quotedTweet?.media?.[0]?.url).toBe(
      "https://cdn.example.com/quoted.jpg",
    );
    expect(meta?.card).toMatchObject({
      url: "https://www.example.com/article",
      domain: "example.com",
      title: "An article",
      description: "About something",
      imageUrl: "https://cdn.example.com/og.jpg",
    });
    expect(meta?.isReply).toBe(true);
    expect(meta?.replyingTo).toBe("bob");
    expect(meta?.media?.map((m) => m.url)).toEqual([
      "https://cdn.example.com/parent.jpg",
    ]);
  });
});

describe("landing OG save matcher", () => {
  it("selects the logo WEBP and not a real carousel post", () => {
    expect(
      isLandingOgThreadsSave({
        source: "threads",
        title: "Join Threads to share ideas, ask questions",
        description:
          "Join Threads to share ideas, ask questions, post random thoughts, find your people and more. Log in with your Instagram.",
        rawJson: {
          capture: {
            media: [
              {
                url: "https://static.cdninstagram.com/rsrc.php/yd/r/kHwIMM5b8PW.webp",
              },
            ],
          },
        },
      }),
    ).toBe(true);
    expect(
      isLandingOgThreadsSave({
        source: "threads",
        title: "lately ୧(•.•)୨",
        description: "lately ୧(•.•)୨",
        rawJson: {
          capture: {
            title: "lately ୧(•.•)୨",
            media: [
              {
                url: "https://instagram.fdub8-1.fna.fbcdn.net/v/t51.82787-15/a.jpg",
              },
              {
                url: "https://instagram.fdub8-1.fna.fbcdn.net/v/t51.82787-15/b.jpg",
              },
            ],
          },
        },
      }),
    ).toBe(false);
  });
});
