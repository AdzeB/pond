import { describe, expect, it } from "vitest";
import {
  avatarFromMeJson,
  entriesFromListing,
  handleFromMeJson,
  redditListingUrl,
} from "./listing";

describe("handleFromMeJson", () => {
  it("reads the logged-in username", () => {
    expect(handleFromMeJson({ kind: "t2", data: { name: "spez" } })).toBe(
      "spez",
    );
  });

  it("returns null for logged-out payloads", () => {
    expect(handleFromMeJson({})).toBeNull();
    expect(handleFromMeJson({ data: {} })).toBeNull();
  });

  it("reads icon_img from me.json", () => {
    expect(
      avatarFromMeJson({
        kind: "t2",
        data: {
          name: "spez",
          icon_img:
            "https://styles.redditmedia.com/icon.png?width=256&amp;s=abc",
          snoovatar_img: "https://i.redd.it/snoo.png",
        },
      }),
    ).toBe("https://styles.redditmedia.com/icon.png?width=256&s=abc");
  });

  it("falls back to snoovatar then the profile subreddit icon", () => {
    expect(
      avatarFromMeJson({
        data: {
          snoovatar_img: "https://i.redd.it/snoo.png",
        },
      }),
    ).toBe("https://i.redd.it/snoo.png");
    expect(
      avatarFromMeJson({
        data: {
          subreddit: {
            icon_img: "https://styles.redditmedia.com/community.png",
          },
        },
      }),
    ).toBe("https://styles.redditmedia.com/community.png");
  });
});

describe("entriesFromListing", () => {
  it("maps t3 children to saved entries", () => {
    const { entries, after } = entriesFromListing({
      data: {
        after: "t3_next",
        children: [
          {
            kind: "t3",
            data: {
              id: "abc123",
              title: "A photo",
              author: "spez",
              permalink: "/r/pics/comments/abc123/a_photo/",
              url: "https://i.redd.it/x.jpg",
              created_utc: 1_700_000_000,
              score: 42,
              num_comments: 7,
              subreddit: "pics",
              subreddit_name_prefixed: "r/pics",
            },
          },
        ],
      },
    });
    expect(after).toBe("t3_next");
    expect(entries).toHaveLength(1);
    expect(entries[0]?.sourceId).toBe("abc123");
    expect(entries[0]?.url).toBe(
      "https://www.reddit.com/r/pics/comments/abc123/a_photo/",
    );
    expect(entries[0]?.mediaUrl).toBe("https://i.redd.it/x.jpg");
    expect(entries[0]?.publishedAt).toBe("2023-11-14T22:13:20.000Z");
    expect(entries[0]?.likes).toBe(42);
    expect(entries[0]?.comments).toBe(7);
    expect(entries[0]?.subreddit).toBe("r/pics");
  });
});

describe("redditListingUrl", () => {
  it("builds saved and upvoted listing URLs", () => {
    expect(redditListingUrl("spez", "saved", null)).toBe(
      "https://www.reddit.com/user/spez/saved.json?limit=100&raw_json=1&type=links",
    );
    expect(redditListingUrl("spez", "upvoted", "t3_next")).toBe(
      "https://www.reddit.com/user/spez/upvoted.json?limit=100&raw_json=1&type=links&after=t3_next",
    );
  });
});
