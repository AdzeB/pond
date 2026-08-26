import type { TweetCardData } from "@shared/tweet-card";

export const SAMPLE_ID = "sample";

export const SAMPLE_CARD: TweetCardData = {
  author: {
    name: "Jace",
    handle: "JaceThings",
    verified: true,
    avatarUrl:
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop",
  },
  text: "My phone feels lighter already",
  publishedAt: "2026-08-20T06:44:00.000Z",
  media: [
    {
      url: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=1200&h=800&fit=crop",
      type: "image",
      width: 1200,
      height: 800,
    },
  ],
  metrics: {
    replies: 32,
    retweets: 7,
    likes: 374,
    views: 12840,
    bookmarks: 53,
  },
  quoted: {
    author: {
      name: "Pond",
      handle: "pond",
      verified: true,
    },
    text: "Save the posts you actually want to keep.",
  },
};
