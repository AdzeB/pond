import { describe, expect, it } from "vitest";
import { parseBookmarksResponses } from "./graphql";

function tweetEntry(id: string, handle: string, text: string) {
  return {
    entryId: `tweet-${id}`,
    content: {
      entryType: "TimelineTimelineItem",
      itemContent: {
        __typename: "TimelineTweet",
        tweet_results: {
          result: {
            __typename: "Tweet",
            rest_id: id,
            legacy: {
              id_str: id,
              full_text: text,
              favorite_count: 3,
              retweet_count: 1,
              reply_count: 0,
            },
            core: {
              user_results: {
                result: {
                  core: { screen_name: handle, name: handle },
                },
              },
            },
          },
        },
      },
    },
  };
}

describe("parseBookmarksResponses", () => {
  it("reads tweets from a Bookmarks envelope", () => {
    const rich = parseBookmarksResponses([
      {
        url: "https://x.com/i/api/graphql/abc/Bookmarks",
        body: JSON.stringify({
          data: {
            bookmark_timeline_v2: {
              timeline: {
                instructions: [
                  {
                    type: "TimelineAddEntries",
                    entries: [tweetEntry("111", "alice", "bookmarked")],
                  },
                ],
              },
            },
          },
        }),
      },
    ]);
    expect(rich.get("111")?.fullText).toBe("bookmarked");
    expect(rich.get("111")?.author.handle).toBe("alice");
  });

  it("reads tweets from a Likes timeline envelope", () => {
    const rich = parseBookmarksResponses([
      {
        url: "https://x.com/i/api/graphql/xyz/Likes",
        body: JSON.stringify({
          data: {
            user: {
              result: {
                timeline_v2: {
                  timeline: {
                    instructions: [
                      {
                        type: "TimelineAddEntries",
                        entries: [tweetEntry("222", "bob", "liked")],
                      },
                    ],
                  },
                },
              },
            },
          },
        }),
      },
    ]);
    expect(rich.get("222")?.fullText).toBe("liked");
    expect(rich.get("222")?.url).toBe("https://x.com/bob/status/222");
  });
});
